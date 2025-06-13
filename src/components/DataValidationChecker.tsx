
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Shield, RefreshCw, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ValidationIssue {
  table: string;
  field: string;
  invalid_value: string;
  count: number;
  suggested_fix: string;
}

export const DataValidationChecker = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Récupérer les examens avec des statuts potentiellement invalides
  const { data: examensData = [], refetch } = useQuery({
    queryKey: ['examens-validation-check', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('id, statut_validation, code_examen')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeSession?.id
  });

  const checkValidationIssues = async () => {
    setIsChecking(true);
    const foundIssues: ValidationIssue[] = [];

    // Vérifier les statuts de validation invalides
    const validStatuts = ['NON_TRAITE', 'EN_COURS', 'VALIDE', 'REJETE'];
    const invalidStatuts = examensData.filter(
      e => e.statut_validation && !validStatuts.includes(e.statut_validation)
    );

    if (invalidStatuts.length > 0) {
      // Grouper par statut invalide
      const groupedByStatus = invalidStatuts.reduce((acc, exam) => {
        const status = exam.statut_validation || 'NULL';
        if (!acc[status]) acc[status] = [];
        acc[status].push(exam);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedByStatus).forEach(([status, exams]) => {
        foundIssues.push({
          table: 'examens',
          field: 'statut_validation',
          invalid_value: status,
          count: exams.length,
          suggested_fix: 'NON_TRAITE'
        });
      });
    }

    setIssues(foundIssues);
    setIsChecking(false);

    if (foundIssues.length === 0) {
      toast({
        title: "✅ Validation réussie",
        description: "Aucun problème de validation détecté.",
      });
    } else {
      toast({
        title: "⚠️ Problèmes détectés",
        description: `${foundIssues.length} problème(s) de validation trouvé(s).`,
        variant: "destructive"
      });
    }
  };

  const fixValidationMutation = useMutation({
    mutationFn: async (issue: ValidationIssue) => {
      if (issue.table === 'examens' && issue.field === 'statut_validation') {
        const { error } = await supabase
          .from('examens')
          .update({ statut_validation: issue.suggested_fix })
          .eq('statut_validation', issue.invalid_value)
          .eq('session_id', activeSession?.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, issue) => {
      toast({
        title: "Correction appliquée",
        description: `${issue.count} enregistrement(s) corrigé(s) pour ${issue.field}.`,
      });
      refetch();
      checkValidationIssues();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer la correction.",
        variant: "destructive"
      });
    }
  });

  const fixAllIssues = async () => {
    for (const issue of issues) {
      await fixValidationMutation.mutateAsync(issue);
    }
  };

  useEffect(() => {
    if (examensData.length > 0) {
      checkValidationIssues();
    }
  }, [examensData]);

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Vérification Validation des Données</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={refetch}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button
              onClick={checkValidationIssues}
              disabled={isChecking}
              size="sm"
            >
              {isChecking ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Détection et correction automatique des erreurs de validation dans les données importées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{examensData.length}</div>
            <div className="text-sm text-blue-800">Examens total</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            issues.length === 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-2xl font-bold ${
              issues.length === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {issues.length}
            </div>
            <div className={`text-sm ${
              issues.length === 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              Problèmes
            </div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            issues.reduce((sum, issue) => sum + issue.count, 0) === 0 ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            <div className={`text-2xl font-bold ${
              issues.reduce((sum, issue) => sum + issue.count, 0) === 0 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {issues.reduce((sum, issue) => sum + issue.count, 0)}
            </div>
            <div className={`text-sm ${
              issues.reduce((sum, issue) => sum + issue.count, 0) === 0 ? 'text-green-800' : 'text-orange-800'
            }`}>
              Enregistrements affectés
            </div>
          </div>
        </div>

        {/* Résultats de la vérification */}
        {issues.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-medium">✅ Toutes les validations sont correctes</div>
              <p className="text-sm">
                Aucun problème de validation détecté dans les données. 
                Vous pouvez procéder à l'import ou à l'attribution des surveillants.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium mb-2">
                  ⚠️ {issues.length} problème(s) de validation détecté(s)
                </div>
                <p className="text-sm mb-3">
                  Ces erreurs peuvent empêcher l'import ou causer des dysfonctionnements. 
                  Cliquez sur "Corriger automatiquement" pour les résoudre.
                </p>
                <Button
                  onClick={fixAllIssues}
                  disabled={fixValidationMutation.isPending}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  {fixValidationMutation.isPending ? 'Correction...' : 'Corriger automatiquement'}
                </Button>
              </AlertDescription>
            </Alert>

            {/* Détail des problèmes */}
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <div key={index} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-yellow-800">
                      Problème: {issue.table}.{issue.field}
                    </h4>
                    <Button
                      onClick={() => fixValidationMutation.mutate(issue)}
                      disabled={fixValidationMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Corriger
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-yellow-700">Valeur invalide:</span>
                      <Badge variant="destructive" className="text-xs">
                        {issue.invalid_value}
                      </Badge>
                      <span className="text-sm text-yellow-700">({issue.count} enregistrements)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-yellow-700">Correction proposée:</span>
                      <Badge variant="outline" className="text-xs bg-green-100">
                        {issue.suggested_fix}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {examensData.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aucun examen trouvé dans la session active. 
              Importez d'abord des examens pour vérifier les validations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
