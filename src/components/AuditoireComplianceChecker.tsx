
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Building2, RefreshCw, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AuditoireAnalysis {
  auditoires_examens: string[];
  auditoires_contraintes: string[];
  auditoires_manquants: string[];
  auditoires_non_utilises: string[];
  total_examens: number;
  examens_par_auditoire: Record<string, number>;
}

export const AuditoireComplianceChecker = () => {
  const { data: activeSession } = useActiveSession();
  const [analysis, setAnalysis] = useState<AuditoireAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Récupérer les auditoires des examens
  const { data: examensData = [], refetch: refetchExamens } = useQuery({
    queryKey: ['examens-auditoires', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('salle')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les contraintes d'auditoires
  const { data: contraintesData = [], refetch: refetchContraintes } = useQuery({
    queryKey: ['contraintes-auditoires-checker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire');
      
      if (error) throw error;
      return data;
    }
  });

  const analyzeCompliance = () => {
    if (!examensData || !contraintesData) return;

    setIsAnalyzing(true);
    
    // Extraire les auditoires uniques des examens
    const auditoiresExamens = [...new Set(examensData.map(e => e.salle.trim()))].filter(Boolean);
    
    // Extraire les auditoires des contraintes
    const auditoiresContraintes = contraintesData.map(c => c.auditoire.trim());
    
    // Trouver les auditoires manquants (présents dans examens mais pas dans contraintes)
    const auditoiresManquants = auditoiresExamens.filter(
      auditoire => !auditoiresContraintes.includes(auditoire)
    );
    
    // Trouver les auditoires non utilisés (présents dans contraintes mais pas dans examens)
    const auditoiresNonUtilises = auditoiresContraintes.filter(
      auditoire => !auditoiresExamens.includes(auditoire)
    );

    // Compter les examens par auditoire
    const examensParAuditoire: Record<string, number> = {};
    examensData.forEach(examen => {
      const auditoire = examen.salle.trim();
      examensParAuditoire[auditoire] = (examensParAuditoire[auditoire] || 0) + 1;
    });

    const newAnalysis: AuditoireAnalysis = {
      auditoires_examens: auditoiresExamens,
      auditoires_contraintes: auditoiresContraintes,
      auditoires_manquants: auditoiresManquants,
      auditoires_non_utilises: auditoiresNonUtilises,
      total_examens: examensData.length,
      examens_par_auditoire: examensParAuditoire
    };

    setAnalysis(newAnalysis);
    setIsAnalyzing(false);

    // Afficher une notification selon le résultat
    if (auditoiresManquants.length === 0) {
      toast({
        title: "✅ Conformité validée",
        description: "Tous les auditoires des examens ont des contraintes définies.",
      });
    } else {
      toast({
        title: "⚠️ Auditoires manquants détectés",
        description: `${auditoiresManquants.length} auditoire(s) nécessitent des contraintes.`,
        variant: "destructive"
      });
    }
  };

  const createMissingConstraints = async () => {
    if (!analysis?.auditoires_manquants.length) return;

    try {
      const constraintsToCreate = analysis.auditoires_manquants.map(auditoire => ({
        auditoire,
        nombre_surveillants_requis: 1,
        description: 'Créé automatiquement depuis la vérification de conformité'
      }));

      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(constraintsToCreate);

      if (error) throw error;

      toast({
        title: "Contraintes créées",
        description: `${constraintsToCreate.length} contrainte(s) d'auditoire créée(s) avec succès.`,
      });

      // Recharger les données
      refetchContraintes();
      analyzeCompliance();

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer les contraintes.",
        variant: "destructive"
      });
    }
  };

  // Analyser automatiquement quand les données changent
  useEffect(() => {
    if (examensData.length > 0 && contraintesData.length >= 0) {
      analyzeCompliance();
    }
  }, [examensData, contraintesData]);

  const refreshData = () => {
    refetchExamens();
    refetchContraintes();
  };

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
            <Building2 className="h-5 w-5" />
            <span>Vérification Conformité Auditoires</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button
              onClick={analyzeCompliance}
              disabled={isAnalyzing}
              size="sm"
            >
              {isAnalyzing ? 'Analyse...' : 'Vérifier'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Vérification de la correspondance entre les auditoires des examens et les contraintes définies.
          Garantit un calcul correct du nombre de surveillants.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis && (
          <>
            {/* Statistiques générales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{analysis.total_examens}</div>
                <div className="text-sm text-blue-800">Examens total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{analysis.auditoires_examens.length}</div>
                <div className="text-sm text-green-800">Auditoires utilisés</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{analysis.auditoires_contraintes.length}</div>
                <div className="text-sm text-purple-800">Contraintes définies</div>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                analysis.auditoires_manquants.length === 0 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                <div className={`text-2xl font-bold ${
                  analysis.auditoires_manquants.length === 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {analysis.auditoires_manquants.length}
                </div>
                <div className={`text-sm ${
                  analysis.auditoires_manquants.length === 0 
                    ? 'text-green-800' 
                    : 'text-red-800'
                }`}>
                  Manquants
                </div>
              </div>
            </div>

            {/* Alerte principale */}
            {analysis.auditoires_manquants.length > 0 ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-2">
                    ⚠️ {analysis.auditoires_manquants.length} auditoire(s) sans contraintes détecté(s)
                  </div>
                  <p className="text-sm mb-3">
                    Ces auditoires utilisent la valeur par défaut (1 surveillant). 
                    Pour un calcul précis, définissez leurs contraintes spécifiques.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {analysis.auditoires_manquants.slice(0, 5).map((auditoire) => (
                        <Badge key={auditoire} variant="destructive" className="text-xs">
                          {auditoire} ({analysis.examens_par_auditoire[auditoire]} examens)
                        </Badge>
                      ))}
                      {analysis.auditoires_manquants.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{analysis.auditoires_manquants.length - 5} autres
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={createMissingConstraints}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer contraintes
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-medium">
                    ✅ Conformité validée
                  </div>
                  <p className="text-sm">
                    Tous les auditoires des examens ont des contraintes définies. 
                    Le calcul du nombre de surveillants sera précis.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Auditoires non utilisés */}
            {analysis.auditoires_non_utilises.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Auditoires avec contraintes mais sans examens ({analysis.auditoires_non_utilises.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.auditoires_non_utilises.map((auditoire) => (
                    <Badge key={auditoire} variant="outline" className="text-xs bg-yellow-100">
                      {auditoire}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  Ces auditoires ont des contraintes définies mais ne sont pas utilisés dans les examens actuels.
                </p>
              </div>
            )}

            {/* Détail des auditoires utilisés */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Auditoires utilisés avec contraintes</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {analysis.auditoires_examens
                  .filter(auditoire => analysis.auditoires_contraintes.includes(auditoire))
                  .map((auditoire) => (
                    <div key={auditoire} className="p-2 bg-green-50 rounded border border-green-200">
                      <div className="font-medium text-green-800 text-sm">{auditoire}</div>
                      <div className="text-xs text-green-600">
                        {analysis.examens_par_auditoire[auditoire]} examen(s)
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {!analysis && examensData.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aucun examen trouvé dans la session active. 
              Importez d'abord des examens pour vérifier la conformité des auditoires.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
