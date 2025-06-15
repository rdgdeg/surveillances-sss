
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PersonneAmenee {
  nom: string;
  prenom: string;
  est_assistant?: boolean;
}

interface UseExamenMutationsProps {
  onPersonneAdded?: () => void;
}

export const useExamenMutations = ({ onPersonneAdded }: UseExamenMutationsProps = {}) => {
  const queryClient = useQueryClient();

  const ajouterPersonneMutation = useMutation({
    mutationFn: async ({ examenId, personne }: { examenId: string; personne: any }) => {
      const { data, error } = await supabase
        .from('personnes_aidantes')
        .insert({
          examen_id: examenId,
          nom: personne.nom,
          prenom: personne.prenom,
          email: personne.email || null,
          est_assistant: personne.est_assistant || false,
          compte_dans_quota: personne.compte_dans_quota !== false,
          present_sur_place: personne.present_sur_place !== false,
          ajoute_par: 'enseignant'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Personne ajoutée",
        description: "La personne a été ajoutée à votre équipe pédagogique.",
      });
      if (onPersonneAdded) onPersonneAdded();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
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
        description: "La personne a été retirée de votre équipe pédagogique.",
      });
    }
  });

  const updateEnseignantPresenceMutation = useMutation({
    mutationFn: async ({ 
      examenId, 
      enseignantPresent, 
      nomEnseignant,
      personnesAmenees, 
      detailsPersonnesAmenees 
    }: { 
      examenId: string; 
      enseignantPresent: boolean; 
      nomEnseignant?: string;
      personnesAmenees: number;
      detailsPersonnesAmenees?: PersonneAmenee[];
    }) => {
      // Vérifier d'abord si l'examen était déjà confirmé
      const { data: examenActuel, error: fetchError } = await supabase
        .from('examens')
        .select('besoins_confirmes_par_enseignant')
        .eq('id', examenId)
        .single();

      if (fetchError) throw fetchError;

      // Préparer les données de mise à jour
      const updateData: any = {
        surveillants_enseignant: enseignantPresent ? 1 : 0,
        surveillants_amenes: personnesAmenees
      };
      
      // Ajouter le nom de l'enseignant s'il est fourni
      if (nomEnseignant) {
        updateData.enseignant_nom = nomEnseignant;
      }

      // Si l'examen était déjà confirmé, remettre le statut en attente
      if (examenActuel?.besoins_confirmes_par_enseignant) {
        updateData.besoins_confirmes_par_enseignant = false;
        updateData.date_confirmation_enseignant = null;
      }

      const { error: updateError } = await supabase
        .from('examens')
        .update(updateData)
        .eq('id', examenId);

      if (updateError) throw updateError;

      // Si des détails de personnes amenées sont fournis, les sauvegarder
      if (detailsPersonnesAmenees && detailsPersonnesAmenees.length > 0) {
        // D'abord, supprimer les anciennes personnes amenées pour cet examen
        await supabase
          .from('personnes_aidantes')
          .delete()
          .eq('examen_id', examenId)
          .eq('ajoute_par', 'enseignant_amene');

        // Ensuite, insérer les nouvelles personnes amenées
        const personnesValides = detailsPersonnesAmenees.filter(p => p.nom && p.prenom);
        if (personnesValides.length > 0) {
          const { error: insertError } = await supabase
            .from('personnes_aidantes')
            .insert(personnesValides.map(personne => ({
              examen_id: examenId,
              nom: personne.nom,
              prenom: personne.prenom,
              est_assistant: personne.est_assistant || false,
              compte_dans_quota: true,
              present_sur_place: true,
              ajoute_par: 'enseignant_amene'
            })));

          if (insertError) throw insertError;
        }
      }

      return { 
        enseignantPresent, 
        personnesAmenees,
        wasConfirmed: examenActuel?.besoins_confirmes_par_enseignant 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      
      if (data.wasConfirmed) {
        toast({
          title: "Informations mises à jour",
          description: "L'examen doit être reconfirmé suite aux modifications.",
          variant: "default"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
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
        title: "Confirmation enregistrée",
        description: "Vos besoins de surveillance ont été confirmés.",
      });
    }
  });

  return {
    ajouterPersonneMutation,
    supprimerPersonneMutation,
    updateEnseignantPresenceMutation,
    confirmerExamenMutation
  };
};
