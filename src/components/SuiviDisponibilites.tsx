
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { ClipboardCheck, Users, CheckCircle, Clock } from "lucide-react";

interface SurveillantDisponibilite {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  total_creneaux: number;
  creneaux_repondus: number;
  pourcentage_completion: number;
  derniere_reponse: string | null;
}

export const SuiviDisponibilites = () => {
  const { data: activeSession } = useActiveSession();
  const [surveillants, setSurveillants] = useState<SurveillantDisponibilite[]>([]);
  const [stats, setStats] = useState({
    total_surveillants: 0,
    ont_repondu: 0,
    completion_moyenne: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!activeSession?.id) return;

      try {
        // Récupérer tous les surveillants actifs pour cette session
        const { data: surveillantsData, error: surveillantsError } = await supabase
          .from('surveillant_sessions')
          .select(`
            surveillant_id,
            surveillants!inner(id, nom, prenom, email, type)
          `)
          .eq('session_id', activeSession.id)
          .eq('is_active', true)
          .neq('quota', 0);

        if (surveillantsError) throw surveillantsError;

        // Pour chaque surveillant, calculer ses statistiques de disponibilité
        const surveillantsWithStats = await Promise.all(
          (surveillantsData || []).map(async (item) => {
            const surveillant = item.surveillants;
            
            // Compter le nombre total de créneaux pour cette session
            const { count: totalCreneaux } = await supabase
              .from('creneaux_surveillance')
              .select('*', { count: 'exact' })
              .eq('examen_id', activeSession.id);

            // Compter le nombre de créneaux pour lesquels ce surveillant a répondu
            const { count: creneauxRepondus } = await supabase
              .from('disponibilites')
              .select('*', { count: 'exact' })
              .eq('surveillant_id', surveillant.id)
              .eq('session_id', activeSession.id);

            // Récupérer la dernière réponse
            const { data: derniereReponse } = await supabase
              .from('disponibilites')
              .select('updated_at')
              .eq('surveillant_id', surveillant.id)
              .eq('session_id', activeSession.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            const pourcentage = totalCreneaux ? Math.round((creneauxRepondus || 0) / totalCreneaux * 100) : 0;

            return {
              id: surveillant.id,
              nom: surveillant.nom,
              prenom: surveillant.prenom,
              email: surveillant.email,
              type: surveillant.type,
              total_creneaux: totalCreneaux || 0,
              creneaux_repondus: creneauxRepondus || 0,
              pourcentage_completion: pourcentage,
              derniere_reponse: derniereReponse?.updated_at || null
            };
          })
        );

        setSurveillants(surveillantsWithStats);

        // Calculer les statistiques globales
        const totalSurveillants = surveillantsWithStats.length;
        const ontRepondu = surveillantsWithStats.filter(s => s.pourcentage_completion > 0).length;
        const completionMoyenne = surveillantsWithStats.reduce((sum, s) => sum + s.pourcentage_completion, 0) / totalSurveillants;

        setStats({
          total_surveillants: totalSurveillants,
          ont_repondu: ontRepondu,
          completion_moyenne: Math.round(completionMoyenne || 0)
        });

      } catch (error: any) {
        console.error('Erreur chargement disponibilités:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeSession?.id]);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des disponibilités...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardCheck className="h-5 w-5" />
            <span>Suivi des Disponibilités</span>
          </CardTitle>
          <CardDescription>
            Progression de la collecte des disponibilités par surveillant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.total_surveillants}</p>
                <p className="text-sm text-blue-700">Surveillants actifs</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.ont_repondu}</p>
                <p className="text-sm text-green-700">Ont commencé à répondre</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.completion_moyenne}%</p>
                <p className="text-sm text-orange-700">Completion moyenne</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {surveillants.map((surveillant) => (
              <div key={surveillant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">{surveillant.nom} {surveillant.prenom}</span>
                    <Badge variant="secondary">{surveillant.type}</Badge>
                    {surveillant.pourcentage_completion === 100 && (
                      <Badge variant="default" className="bg-green-500">Complet</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{surveillant.email}</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={surveillant.pourcentage_completion} className="flex-1" />
                    <span className="text-sm font-medium min-w-[60px]">
                      {surveillant.pourcentage_completion}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {surveillant.creneaux_repondus} / {surveillant.total_creneaux} créneaux
                    {surveillant.derniere_reponse && (
                      <span className="ml-2">
                        • Dernière réponse: {new Date(surveillant.derniere_reponse).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {surveillants.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucun surveillant actif trouvé pour cette session.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
