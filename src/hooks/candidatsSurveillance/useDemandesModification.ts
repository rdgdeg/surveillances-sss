
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemandeModification {
  id: string;
  commentaire: string | null;
  statut: string | null;
  created_at: string;
}

export function useDemandesModification(candidatId?: string) {
  return useQuery({
    queryKey: ['demandes-modification', candidatId],
    queryFn: async (): Promise<DemandeModification[]> => {
      if (!candidatId) return [];
      const { data, error } = await supabase
        .from('demandes_modification_info')
        .select('*')
        .eq('candidat_id', candidatId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!candidatId
  });
}
