
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useUpdateTraiteCandidat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ candidatId, traite }: { candidatId: string; traite: boolean }) => {
      const { error } = await supabase
        .from('candidats_surveillance')
        .update({ traite })
        .eq('id', candidatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidats-surveillance'] });
      toast({
        title: "Succès",
        description: "Statut mis à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  });
}
