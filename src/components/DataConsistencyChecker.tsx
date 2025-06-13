
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Users, Calendar, Clock, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface ConsistencyReport {
  surveillantsCount: number;
  examensCount: number;
  disponibilitesCount: number;
  surveillantsSansDisponibilites: string[];
  examensWithoutDisponibilites: string[];
  conflictsDetected: string[];
  quotaIssues: string[];
}

export const DataConsistencyChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const { data: activeSession } = useActiveSession();

  const runConsistencyCheck = async () => {
    if (!activeSession) {
      toast({
        title: "Erreur",
        description: "Aucune session active",
        variant: "destructive"
      });
      return;
    }

    setIsChecking(true);
    try {
      // Récupérer les surveillants actifs
      const { data: surveillants } = await supabase
        .from('surveillants')
        .select('id, nom, prenom, email, type')
        .eq('statut', 'actif');

      // Récupérer les examens de la session
      const { data: examens } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id);

      // Récupérer les disponibilités
      const { data: disponibilites } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id);

      // Récupérer les quotas
      const { data: quotas } = await supabase
        .from('surveillant_sessions')
        .select('surveillant_id, quota, sessions_imposees')
        .eq('session_id', activeSession.id)
        .eq('is_active', true);

      const surveillantsCount = surveillants?.length || 0;
      const examensCount = examens?.length || 0;
      const disponibilitesCount = disponibilites?.length || 0;

      // Identifier les surveillants sans disponibilités
      const surveillantsWithDisponibilites = new Set(
        disponibilites?.map(d => d.surveillant_id) || []
      );
      const surveillantsSansDisponibilites = (surveillants || [])
        .filter(s => !surveillantsWithDisponibilites.has(s.id))
        .map(s => `${s.nom} ${s.prenom} (${s.email})`);

      // Identifier les examens sans aucune disponibilité correspondante
      const examensWithoutDisponibilites: string[] = [];
      if (examens && disponibilites) {
        for (const examen of examens) {
          const hasDisponibilites = disponibilites.some(d => 
            d.date_examen === examen.date_examen &&
            d.heure_debut === examen.heure_debut &&
            d.heure_fin === examen.heure_fin &&
            d.est_disponible === true
          );
          if (!hasDisponibilites) {
            examensWithoutDisponibilites.push(
              `${examen.matiere} - ${examen.date_examen} ${examen.heure_debut}-${examen.heure_fin} (${examen.salle})`
            );
          }
        }
      }

      // Vérifier les quotas par rapport aux types
      const quotaIssues: string[] = [];
      if (quotas && surveillants) {
        for (const quota of quotas) {
          const surveillant = surveillants.find(s => s.id === quota.surveillant_id);
          if (surveillant) {
            const defaultQuota = surveillant.type === 'PAT' ? 12 : 
                                surveillant.type === 'Assistant' ? 6 : 4;
            if (quota.sessions_imposees > quota.quota) {
              quotaIssues.push(
                `${surveillant.nom} ${surveillant.prenom}: Sessions imposées (${quota.sessions_imposees}) > Quota (${quota.quota})`
              );
            }
            if (quota.quota > defaultQuota * 1.5) {
              quotaIssues.push(
                `${surveillant.nom} ${surveillant.prenom}: Quota très élevé (${quota.quota}) pour un ${surveillant.type}`
              );
            }
          }
        }
      }

      const newReport: ConsistencyReport = {
        surveillantsCount,
        examensCount,
        disponibilitesCount,
        surveillantsSansDisponibilites,
        examensWithoutDisponibilites,
        conflictsDetected: [], // À implémenter si nécessaire
        quotaIssues
      };

      setReport(newReport);

      // Toast de résumé
      const issuesCount = 
        newReport.surveillantsSansDisponibilites.length +
        newReport.examensWithoutDisponibilites.length +
        newReport.quotaIssues.length;

      if (issuesCount === 0) {
        toast({
          title: "✅ Données cohérentes",
          description: "Aucun problème de cohérence détecté.",
        });
      } else {
        toast({
          title: "⚠️ Problèmes détectés",
          description: `${issuesCount} problème(s) de cohérence trouvé(s).`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Erreur lors du contrôle de cohérence:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier la cohérence des données.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (count: number) => {
    return count === 0 ? "text-green-600" : "text-orange-600";
  };

  const getStatusIcon = (count: number) => {
    return count === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Contrôle de Cohérence des Données</span>
        </CardTitle>
        <CardDescription>
          Vérifiez la cohérence entre surveillants, examens, disponibilités et quotas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeSession && (
          <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 text-sm">Aucune session active</span>
          </div>
        )}

        <Button 
          onClick={runConsistencyCheck}
          disabled={!activeSession || isChecking}
          className="w-full"
        >
          {isChecking ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Vérification en cours...</span>
            </div>
          ) : (
            "Lancer le contrôle de cohérence"
          )}
        </Button>

        {report && (
          <div className="space-y-4">
            {/* Statistiques générales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{report.surveillantsCount}</div>
                <div className="text-xs text-blue-600">Surveillants</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{report.examensCount}</div>
                <div className="text-xs text-green-600">Examens</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <Clock className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">{report.disponibilitesCount}</div>
                <div className="text-xs text-purple-600">Disponibilités</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-1 text-orange-600" />
                <div className="text-2xl font-bold text-orange-600">
                  {report.surveillantsSansDisponibilites.length + 
                   report.examensWithoutDisponibilites.length + 
                   report.quotaIssues.length}
                </div>
                <div className="text-xs text-orange-600">Problèmes</div>
              </div>
            </div>

            {/* Détails des problèmes */}
            <div className="space-y-3">
              {/* Surveillants sans disponibilités */}
              <div className={`p-3 rounded-lg border ${
                report.surveillantsSansDisponibilites.length === 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`flex items-center space-x-2 mb-2 ${getStatusColor(report.surveillantsSansDisponibilites.length)}`}>
                  {getStatusIcon(report.surveillantsSansDisponibilites.length)}
                  <span className="font-medium">
                    Surveillants sans disponibilités ({report.surveillantsSansDisponibilites.length})
                  </span>
                </div>
                {report.surveillantsSansDisponibilites.length > 0 && (
                  <div className="space-y-1">
                    {report.surveillantsSansDisponibilites.map((surveillant, index) => (
                      <Badge key={index} variant="destructive" className="mr-2 mb-1">
                        {surveillant}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Examens sans disponibilités */}
              <div className={`p-3 rounded-lg border ${
                report.examensWithoutDisponibilites.length === 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`flex items-center space-x-2 mb-2 ${getStatusColor(report.examensWithoutDisponibilites.length)}`}>
                  {getStatusIcon(report.examensWithoutDisponibilites.length)}
                  <span className="font-medium">
                    Examens sans surveillants disponibles ({report.examensWithoutDisponibilites.length})
                  </span>
                </div>
                {report.examensWithoutDisponibilites.length > 0 && (
                  <div className="space-y-1">
                    {report.examensWithoutDisponibilites.slice(0, 5).map((examen, index) => (
                      <div key={index} className="text-sm text-orange-800">
                        • {examen}
                      </div>
                    ))}
                    {report.examensWithoutDisponibilites.length > 5 && (
                      <div className="text-sm text-orange-600">
                        ... et {report.examensWithoutDisponibilites.length - 5} autres
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Problèmes de quotas */}
              <div className={`p-3 rounded-lg border ${
                report.quotaIssues.length === 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`flex items-center space-x-2 mb-2 ${getStatusColor(report.quotaIssues.length)}`}>
                  {getStatusIcon(report.quotaIssues.length)}
                  <span className="font-medium">
                    Problèmes de quotas ({report.quotaIssues.length})
                  </span>
                </div>
                {report.quotaIssues.length > 0 && (
                  <div className="space-y-1">
                    {report.quotaIssues.map((issue, index) => (
                      <div key={index} className="text-sm text-orange-800">
                        • {issue}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
