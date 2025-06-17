
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Play, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";

interface ConsistencyCheck {
  id: string;
  name: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  message: string;
  count?: number;
}

export const DataConsistencyChecker = () => {
  const { data: activeSession } = useActiveSession();
  const [checks, setChecks] = useState<ConsistencyCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runConsistencyChecks = async () => {
    if (!activeSession?.id) {
      toast({
        title: "Erreur",
        description: "Aucune session active pour effectuer les contrôles.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    const results: ConsistencyCheck[] = [];

    try {
      // Check 1: Examens sans surveillants assignés
      const { data: examensNonAssignes } = await supabase
        .from('examens')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE')
        .gte('nombre_surveillants', 1);

      const { data: attributions } = await supabase
        .from('attributions')
        .select('examen_id')
        .eq('session_id', activeSession.id);

      const examensAvecAttributions = new Set(attributions?.map(a => a.examen_id) || []);
      const examensNonCouvers = examensNonAssignes?.filter(e => !examensAvecAttributions.has(e.id)) || [];

      results.push({
        id: 'examens-non-assignes',
        name: 'Examens sans surveillants',
        description: 'Examens validés sans aucun surveillant assigné',
        status: examensNonCouvers.length > 0 ? 'warning' : 'success',
        message: examensNonCouvers.length > 0 
          ? `${examensNonCouvers.length} examens sans surveillants assignés`
          : 'Tous les examens ont des surveillants assignés',
        count: examensNonCouvers.length
      });

      // Check 2: Surveillants avec disponibilités mais sans assignations
      const { data: disponibilites } = await supabase
        .from('disponibilites')
        .select('surveillant_id')
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true);

      const surveillantsDisponibles = new Set(disponibilites?.map(d => d.surveillant_id) || []);
      const surveillantsAssignes = new Set(attributions?.map(a => a.surveillant_id) || []);
      
      const surveillantsSansAssignation = Array.from(surveillantsDisponibles)
        .filter(id => !surveillantsAssignes.has(id));

      results.push({
        id: 'surveillants-non-assignes',
        name: 'Surveillants disponibles non assignés',
        description: 'Surveillants ayant donné leurs disponibilités mais sans assignation',
        status: surveillantsSansAssignation.length > 0 ? 'warning' : 'success',
        message: surveillantsSansAssignation.length > 0
          ? `${surveillantsSansAssignation.length} surveillants disponibles non assignés`
          : 'Tous les surveillants disponibles sont assignés',
        count: surveillantsSansAssignation.length
      });

      // Check 3: Attributions sur des examens inactifs
      const { data: attributionsInactives } = await supabase
        .from('attributions')
        .select(`
          id,
          examens!inner (
            is_active,
            statut_validation
          )
        `)
        .eq('session_id', activeSession.id)
        .or('is_active.eq.false,statut_validation.neq.VALIDE', { foreignTable: 'examens' });

      results.push({
        id: 'attributions-invalides',
        name: 'Attributions sur examens invalides',
        description: 'Attributions sur des examens inactifs ou non validés',
        status: (attributionsInactives?.length || 0) > 0 ? 'error' : 'success',
        message: (attributionsInactives?.length || 0) > 0
          ? `${attributionsInactives?.length} attributions sur examens invalides`
          : 'Toutes les attributions sont sur des examens valides',
        count: attributionsInactives?.length || 0
      });

      setChecks(results);

      toast({
        title: "Contrôles terminés",
        description: `${results.length} contrôles effectués avec succès.`,
      });

    } catch (error) {
      console.error('Erreur lors des contrôles:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'exécution des contrôles de cohérence.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">OK</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="text-orange-700 bg-orange-100">Attention</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour effectuer les contrôles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Contrôles d'Intégrité des Données</span>
          </CardTitle>
          <CardDescription>
            Vérification de la cohérence des données pour la session {activeSession.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Session active : <strong>{activeSession.name}</strong>
            </div>
            <Button 
              onClick={runConsistencyChecks}
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{isRunning ? "Contrôles en cours..." : "Lancer les contrôles"}</span>
            </Button>
          </div>

          {checks.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {checks.filter(c => c.status === 'success').length}
                      </div>
                      <div className="text-sm text-green-700">Contrôles OK</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {checks.filter(c => c.status === 'warning').length}
                      </div>
                      <div className="text-sm text-orange-700">Avertissements</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {checks.filter(c => c.status === 'error').length}
                      </div>
                      <div className="text-sm text-red-700">Erreurs</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                {checks.map((check) => (
                  <Card key={check.id} className={
                    check.status === 'error' ? 'border-red-200 bg-red-50' :
                    check.status === 'warning' ? 'border-orange-200 bg-orange-50' :
                    'border-green-200 bg-green-50'
                  }>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <div className="font-medium">{check.name}</div>
                            <div className="text-sm text-gray-600">{check.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {check.count !== undefined && check.count > 0 && (
                            <Badge variant="outline">{check.count}</Badge>
                          )}
                          {getStatusBadge(check.status)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        {check.message}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {checks.length === 0 && !isRunning && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Cliquez sur "Lancer les contrôles" pour vérifier l'intégrité des données de la session active.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
