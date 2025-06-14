
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CandidatSurveillance {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  statut: string;
  statut_autre?: string;
  traite: boolean;
  created_at: string;
  disponibilites_count?: number;
  session_id?: string;
}

export function useCandidatsSurveillance(sessionId?: string) {
  return useQuery({
    queryKey: ['candidats-surveillance', sessionId],
    queryFn: async (): Promise<CandidatSurveillance[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('candidats_surveillance')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const candidatsWithCount = await Promise.all(
        (data || []).map(async (candidat) => {
          const { data: surveillant, error: surveillantErr } = await supabase
            .from('surveillants')
            .select('id, email')
            .eq('email', candidat.email?.trim())
            .maybeSingle();

          if (surveillantErr) {
            console.log('Erreur de recherche surveillant', surveillantErr);
          }
          let count = 0;
          if (surveillant) {
            const { count: dispoCount, error: dispoErr } = await supabase
              .from('disponibilites')
              .select('id', { count: 'exact', head: true })
              .eq('surveillant_id', surveillant.id)
              .eq('session_id', candidat.session_id);
            if (dispoErr) {
              console.log('Erreur de recherche disponibilites', dispoErr);
            }
            count = dispoCount ?? 0;
          } else {
            console.log(`Aucun surveillant trouvé pour: ${candidat.prenom} ${candidat.nom} <${candidat.email}>`);
          }
          return { ...candidat, disponibilites_count: count };
        })
      );
      return candidatsWithCount;
    },
    enabled: !!sessionId
  });
}
