
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
      const { error } = await supabase
        .from("examens_import_temp")
        .update(fields)
        .eq("id", id);
      if (error) throw error;
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
      if (!rowIds.length) return;
      
      // Marquer comme validés
      const { error: updateError } = await supabase
        .from("examens_import_temp")
        .update({ statut })
        .in("id", rowIds);
      if (updateError) throw updateError;

      // Si validation, créer les examens définitifs
      if (statut === "VALIDE") {
        const { data: validatedRows, error: fetchError } = await supabase
          .from("examens_import_temp")
          .select("*")
          .in("id", rowIds);
        if (fetchError) throw fetchError;

        // Créer les examens définitifs
        const examensToCreate = validatedRows.map(row => {
          const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          
          return {
            session_id: row.session_id,
            code_examen: data["Code"] || data["code"] || "",
            matiere: data["Activite"] || data["Matière"] || data["matiere"] || "",
            date_examen: data["Jour"] || data["Date"] || "",
            heure_debut: data["Heure"] || data["heure_debut"] || "08:00",
            heure_fin: data["Fin"] || data["heure_fin"] || "10:00",
            salle: data["Auditoires"] || data["Salle"] || "",
            faculte: data["Faculte"] || data["Faculté"] || data["faculte"] || "",
            type_requis: "TOUS",
            nombre_surveillants: 1,
            statut_validation: "VALIDE"
          };
        });

        const { error: insertError } = await supabase
          .from("examens")
          .insert(examensToCreate);
        if (insertError) throw insertError;

        console.log(`✅ ${examensToCreate.length} examens créés avec succès`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["examens-import-temp"] });
      qc.invalidateQueries({ queryKey: ["examens-review"] });
      qc.invalidateQueries({ queryKey: ["examens-valides"] });
      qc.invalidateQueries({ queryKey: ["creneaux-surveillance"] });
    },
  });
}
