
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useExamenMutations({ onPersonneAdded }: { onPersonneAdded?: () => void } = {}) {
  const queryClient = useQueryClient();

  const ajouterPersonneMutation = useMutation({
    mutationFn: async ({ examenId, personne }: { examenId: string; personne: any }) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .insert({
          examen_id: examenId,
          ...personne
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      onPersonneAdded && onPersonneAdded();
      toast({
        title: "Personne ajoutée",
        description: "La personne aidante a été ajoutée avec succès."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la personne.",
        variant: "destructive"
      });
    }
  });

  const supprimerPersonneMutation = useMutation({
    mutationFn: async (personneId: string) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .delete()
        .eq('id', personneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Personne supprimée",
        description: "La personne aidante a été supprimée."
      });
    }
  });

  const updateEnseignantPresenceMutation = useMutation({
    mutationFn: async ({ examenId, enseignantPresent, personnesAmenees }: { 
      examenId: string; 
      enseignantPresent: boolean; 
      personnesAmenees: number;
    }) => {
      const { error } = await supabase
        .from('examens')
        .update({
          enseignant_present: enseignantPresent,
          personnes_amenees: personnesAmenees
        })
        .eq('id', examenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Présence mise à jour",
        description: "Les informations de présence ont été sauvegardées."
      });
    }
  });

  const confirmerExamenMutation = useMutation({
    mutationFn: async (examenId: string) => {
      const { error } = await supabase
        .from('examens')
        .update({
          besoins_confirmes_par_enseignant: true,
          date_confirmation_enseignant: new Date().toISOString()
        })
        .eq('id', examenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Examen confirmé",
        description: "Les besoins de surveillance ont été confirmés."
      });
    }
  });

  return {
    ajouterPersonneMutation,
    supprimerPersonneMutation,
    updateEnseignantPresenceMutation,
    confirmerExamenMutation,
  }
}
