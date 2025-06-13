
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { ExamenReview, ContrainteAuditoire, ExamenGroupe } from "@/utils/examenReviewUtils";

export const useExamenReview = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editingExamens, setEditingExamens] = useState<Record<string, Partial<ExamenGroupe>>>({});
  const [selectedGroupes, setSelectedGroupes] = useState<Set<string>>(new Set());

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenReview[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          personnes_aidantes (*)
        `)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'NON_TRAITE')
        .eq('is_active', true)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true })
        .order('code_examen', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async (): Promise<ContrainteAuditoire[]> => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (error) throw error;
      return data || [];
    }
  });

  const updateExamenMutation = useMutation({
    mutationFn: async ({ groupe, updates }: { groupe: ExamenGroupe; updates: Partial<ExamenGroupe> }) => {
      for (const examen of groupe.examens) {
        const examenUpdates: any = {};
        
        if (updates.nombre_surveillants_total !== undefined) {
          examenUpdates.nombre_surveillants = Math.ceil(updates.nombre_surveillants_total / groupe.examens.length);
        }
        
        if (updates.surveillants_enseignant_total !== undefined) {
          examenUpdates.surveillants_enseignant = Math.ceil(updates.surveillants_enseignant_total / groupe.examens.length);
        }
        
        if (updates.surveillants_amenes_total !== undefined) {
          examenUpdates.surveillants_amenes = Math.ceil(updates.surveillants_amenes_total / groupe.examens.length);
        }
        
        if (updates.surveillants_pre_assignes_total !== undefined) {
          examenUpdates.surveillants_pre_assignes = Math.ceil(updates.surveillants_pre_assignes_total / groupe.examens.length);
        }

        if (Object.keys(examenUpdates).length > 0) {
          const { error } = await supabase
            .from('examens')
            .update(examenUpdates)
            .eq('id', examen.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setEditingExamens({});
      toast({
        title: "Examens mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les examens.",
        variant: "destructive"
      });
    }
  });

  const validateExamensMutation = useMutation({
    mutationFn: async (groupes: ExamenGroupe[]) => {
      const examensToValidate = groupes.flatMap(groupe => groupe.examens);
      
      for (const examen of examensToValidate) {
        const { error } = await supabase
          .from('examens')
          .update({ statut_validation: 'VALIDE' })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, groupes) => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-valides'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setSelectedGroupes(new Set());
      toast({
        title: "Examens validés",
        description: `${groupes.length} groupe(s) d'examens ont été validés avec succès.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider les examens.",
        variant: "destructive"
      });
    }
  });

  const applquerContraintesAuditoiresMutation = useMutation({
    mutationFn: async () => {
      if (!examens || !contraintesAuditoires) return;

      for (const examen of examens) {
        const auditoire_unifie = examen.salle.trim().match(/^Neerveld\s+[A-Z]$/i) ? "Neerveld" : examen.salle.trim();
        
        let contrainteUnifiee = 1;
        if (auditoire_unifie === "Neerveld") {
          const contraintesNeerveld = contraintesAuditoires.filter(c => 
            c.auditoire.match(/^Neerveld\s+[A-Z]$/i)
          );
          contrainteUnifiee = contraintesNeerveld.reduce((sum, c) => sum + c.nombre_surveillants_requis, 0) || 1;
        } else {
          const contrainteExacte = contraintesAuditoires.find(c => c.auditoire === auditoire_unifie);
          if (contrainteExacte) {
            contrainteUnifiee = contrainteExacte.nombre_surveillants_requis;
          }
        }
        
        const { error } = await supabase
          .from('examens')
          .update({ nombre_surveillants: contrainteUnifiee })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      toast({
        title: "Contraintes appliquées",
        description: "Les contraintes d'auditoires ont été appliquées à tous les examens.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer les contraintes.",
        variant: "destructive"
      });
    }
  });

  const toggleExamenActiveMutation = useMutation({
    mutationFn: async ({ examenId, isActive }: { examenId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('examens')
        .update({ is_active: isActive })
        .eq('id', examenId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      queryClient.invalidateQueries({ queryKey: ['examens-valides'] });
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: isActive ? "Examen activé" : "Examen désactivé",
        description: isActive 
          ? "L'examen est maintenant actif et peut être attribué."
          : "L'examen est désactivé et ne sera pas attribué.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut de l'examen.",
        variant: "destructive"
      });
    }
  });

  return {
    examens,
    contraintesAuditoires,
    isLoading,
    editingExamens,
    setEditingExamens,
    selectedGroupes,
    setSelectedGroupes,
    updateExamenMutation,
    validateExamensMutation,
    applquerContraintesAuditoiresMutation,
    toggleExamenActiveMutation,
    activeSession
  };
};
