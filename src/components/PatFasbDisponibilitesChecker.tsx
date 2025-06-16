
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActiveSession } from "@/hooks/useSessions";

interface PatFasbSurveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  quota: number;
  disponibilites_count: number;
  quota_minimum_requis: number;
  est_conforme: boolean;
}

export const PatFasbDisponibilitesChecker = () => {
  const { data: activeSession } = useActiveSession();

  const { data: patFasbSurveillants, isLoading } = useQuery({
    queryKey: ["pat-fasb-disponibilites-check", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      // Récupérer les surveillants PAT FASB actifs pour la session
      const { data: surveillants, error: surveillantsError } = await supabase
        .from("surveillants")
        .select(`
          id,
          nom,
          prenom,
          email,
          type,
          surveillant_sessions!inner(quota, is_active)
        `)
        .eq("statut", "actif")
        .eq("type", "PAT")
        .eq("surveillant_sessions.session_id", activeSession.id)
        .eq("surveillant_sessions.is_active", true);

      if (surveillantsError) throw surveillantsError;

      if (!surveillants || surveillants.length === 0) return [];

      // Pour chaque surveillant PAT, compter ses disponibilités
      const patFasbData: PatFasbSurveillant[] = await Promise.all(
        surveillants.map(async (surveillant) => {
          const { data: disponibilites, error: dispoError } = await supabase
            .from("disponibilites")
            .select("id")
            .eq("surveillant_id", surveillant.id)
            .eq("session_id", activeSession.id)
            .eq("est_disponible", true);

          if (dispoError) {
            console.error("Erreur lors de la récupération des disponibilités:", dispoError);
            return null;
          }

          const quota = surveillant.surveillant_sessions[0]?.quota || 0;
          const disponibilites_count = disponibilites?.length || 0;
          const quota_minimum_requis = Math.ceil(quota * 1.3); // quota + 30%
          const est_conforme = disponibilites_count >= quota_minimum_requis;

          return {
            id: surveillant.id,
            nom: surveillant.nom,
            prenom: surveillant.prenom,
            email: surveillant.email,
            quota,
            disponibilites_count,
            quota_minimum_requis,
            est_conforme,
          };
        })
      );

      return patFasbData.filter(Boolean) as PatFasbSurveillant[];
    },
    enabled: !!activeSession?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Vérification des disponibilités PAT FASB...</p>
        </CardContent>
      </Card>
    );
  }

  if (!patFasbSurveillants || patFasbSurveillants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Contrôle PAT FASB</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Aucun surveillant PAT FASB trouvé pour cette session.</p>
        </CardContent>
      </Card>
    );
  }

  const surveillantsNonConformes = patFasbSurveillants.filter(s => !s.est_conforme);
  const surveillantsConformes = patFasbSurveillants.filter(s => s.est_conforme);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Contrôle Disponibilités PAT FASB</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{patFasbSurveillants.length}</div>
            <div className="text-sm text-blue-600">Total PAT FASB</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{surveillantsConformes.length}</div>
            <div className="text-sm text-green-600">Conformes</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{surveillantsNonConformes.length}</div>
            <div className="text-sm text-red-600">Non conformes</div>
          </div>
        </div>

        {/* Surveillants non conformes */}
        {surveillantsNonConformes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Surveillants avec disponibilités insuffisantes :</h3>
            </div>
            <div className="space-y-2">
              {surveillantsNonConformes.map((surveillant) => (
                <div key={surveillant.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{surveillant.prenom} {surveillant.nom}</div>
                      <div className="text-sm text-gray-600">{surveillant.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="mb-1">
                        {surveillant.disponibilites_count}/{surveillant.quota_minimum_requis}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        Quota: {surveillant.quota} → Minimum requis: {surveillant.quota_minimum_requis}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-red-700">
                    ⚠️ Pas assez de disponibilités indiquées pour permettre une bonne gestion des surveillances
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Surveillants conformes */}
        {surveillantsConformes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-semibold">Surveillants avec disponibilités suffisantes :</h3>
            </div>
            <div className="space-y-2">
              {surveillantsConformes.map((surveillant) => (
                <div key={surveillant.id} className="p-3 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{surveillant.prenom} {surveillant.nom}</div>
                      <div className="text-sm text-gray-600">{surveillant.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default" className="mb-1">
                        {surveillant.disponibilites_count}/{surveillant.quota_minimum_requis}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        Quota: {surveillant.quota} → Minimum requis: {surveillant.quota_minimum_requis}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
