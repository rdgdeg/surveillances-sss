
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

// Pour valider en lot
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
      const { error } = await supabase
        .from("examens_import_temp")
        .update({ statut })
        .in("id", rowIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["examens-import-temp"] });
    },
  });
}
