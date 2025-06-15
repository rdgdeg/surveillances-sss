import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

// Récupère tous les imports pour la session courante (filtre par batch si besoin)
export function useExamensImportTemp(batchId?: string) {
  const { data: activeSession } = useActiveSession();
  return useQuery({
    queryKey: ["examens-import-temp", activeSession?.id, batchId],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      let query = supabase
        .from("examens_import_temp")
        .select("*")
        .eq("session_id", activeSession.id)
        .order("ordre_import");
      if (batchId) query = query.eq("import_batch_id", batchId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id,
  });
}

// Ajout d'un nouvel import (batch)
// dataRows = tableau de { ordre_import, data (JSON) }
export function useExamensImportTempMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session_id,
      imported_by,
      batch_id,
      rows,
    }: {
      session_id: string;
      imported_by: string | null;
      batch_id: string;
      rows: { ordre_import: number; data: any }[];
    }) => {
      // Insère en lot
      const { error } = await supabase.from("examens_import_temp").insert(
        rows.map((row, idx) => ({
          session_id,
          imported_by,
          import_batch_id: batch_id,
          ordre_import: row.ordre_import,
          data: row.data,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
    },
  });
}

// Pour mettre à jour/corriger une ligne
export function useUpdateExamenImportTemp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      statut,
      erreurs,
    }: {
      id: string;
      data?: any;
      statut?: string;
      erreurs?: string | null;
    }) => {
      const fields: any = {};
      if (data !== undefined) fields.data = data;
      if (statut !== undefined) fields.statut = statut;
      if (erreurs !== undefined) fields.erreurs = erreurs;
      
      console.log("Mise à jour de l'examen import:", id, fields);
      
      const { error } = await supabase
        .from("examens_import_temp")
        .update(fields)
        .eq("id", id);
      if (error) {
        console.error("Erreur lors de la mise à jour:", error);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["examens-import-temp"] });
    },
  });
}

// Pour valider en lot et créer les examens définitifs
export function useBatchValidateExamensImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rowIds,
      statut,
    }: {
      rowIds: string[];
      statut: string;
    }) => {
      if (!rowIds.length) {
        throw new Error("Aucun examen sélectionné pour la validation");
      }
      
      console.log("Début de la validation par lot:", rowIds, statut);
      
      // Récupérer d'abord les données des examens à valider
      const { data: examensToValidate, error: fetchError } = await supabase
        .from("examens_import_temp")
        .select("*")
        .in("id", rowIds);
      
      if (fetchError) {
        console.error("Erreur lors de la récupération des examens:", fetchError);
        throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
      }

      if (!examensToValidate || examensToValidate.length === 0) {
        throw new Error("Aucun examen trouvé pour la validation");
      }

      console.log("Examens récupérés pour validation:", examensToValidate.length);

      // Marquer comme validés dans la table temporaire
      const { error: updateError } = await supabase
        .from("examens_import_temp")
        .update({ statut })
        .in("id", rowIds);
      
      if (updateError) {
        console.error("Erreur lors de la mise à jour du statut:", updateError);
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
      }

      // Si validation, créer les examens définitifs
      if (statut === "VALIDE") {
        console.log("Création des examens définitifs...");
        
        const examensToCreate = examensToValidate.map(row => {
          const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          
          // Validation des champs obligatoires
          const codeExamen = data["Code"] || data["code"] || "";
          const matiere = data["Activite"] || data["Matière"] || data["matiere"] || "";
          const dateExamen = data["Jour"] || data["Date"] || "";
          const salle = data["Auditoires"] || data["Salle"] || "";
          
          if (!codeExamen || !matiere || !dateExamen || !salle) {
            console.warn("Données manquantes pour l'examen:", data);
          }
          
          return {
            session_id: row.session_id,
            code_examen: codeExamen,
            matiere: matiere,
            date_examen: dateExamen,
            heure_debut: data["Heure"] || data["heure_debut"] || "08:00",
            heure_fin: data["Fin"] || data["heure_fin"] || "10:00",
            salle: salle,
            faculte: data["Faculte"] || data["Faculté"] || data["faculte"] || "",
            type_requis: "TOUS",
            nombre_surveillants: 1,
            statut_validation: "VALIDE"
          };
        });

        console.log("Insertion des examens:", examensToCreate);

        const { error: insertError } = await supabase
          .from("examens")
          .insert(examensToCreate);
        
        if (insertError) {
          console.error("Erreur lors de l'insertion des examens:", insertError);
          throw new Error(`Erreur lors de la création des examens: ${insertError.message}`);
        }

        console.log(`✅ ${examensToCreate.length} examens créés avec succès`);
      }
    },
    onSuccess: () => {
      console.log("Validation terminée, invalidation des queries...");
      qc.invalidateQueries({ queryKey: ["examens-import-temp"] });
      qc.invalidateQueries({ queryKey: ["examens-review"] });
      qc.invalidateQueries({ queryKey: ["examens-valides"] });
      qc.invalidateQueries({ queryKey: ["creneaux-surveillance"] });
    },
    onError: (error) => {
      console.error("Erreur dans la validation par lot:", error);
    }
  });
}
