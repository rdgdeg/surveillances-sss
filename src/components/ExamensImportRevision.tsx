import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExamensImportTemp, useUpdateExamenImportTemp, useBatchValidateExamensImport } from "@/hooks/useExamensImportTemp";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Delete } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { excelTimeToHHMM, excelDateString, excelDurationToHM } from "@/utils/examensImportUtils";
import { getExamProblem } from "@/utils/examensImportProblems";
import { ExamensImportTable } from "./ExamensImportTable";

// Champs à mapper explicitement dans un ordre idéal pour l’affichage
const IDEAL_COL_ORDER = [
  "Jour",
  "Debut",
  "Fin",
  "Duree",
  "Faculte",
  "Code",
  "Activite",
  "Auditoires",
  "Etudiants",
  "Enseignants"
];

export function ExamensImportRevision({ batchId }: { batchId?: string }) {
  const { data: rows = [], isLoading } = useExamensImportTemp(batchId);
  const updateMutation = useUpdateExamenImportTemp();
  const batchValidate = useBatchValidateExamensImport();
  const { data: contraintesAuditoires } = useContraintesAuditoires();
  const queryClient = useQueryClient();

  const [editRow, setEditRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [validating, setValidating] = useState(false);

  // Pour la suppression
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Suppression dans Supabase
      const { error } = await supabase.from("examens_import_temp").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
      toast({ title: "Examen supprimé", description: "La ligne a été supprimée." });
      setDeleteRowId(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer la ligne." });
    }
  });

  // On retire l'obligation sur l'auditoire (plus de contrainte dans la révision)

  function getSurvTh(data: any) {
    const audString =
      data["Auditoires"] ||
      data["auditoires"] ||
      data["salle"] ||
      "";
    if (!audString || !contraintesAuditoires) return null;
    // On supporte plusieurs auditoires séparés par , ou ;
    const auditoires = audString.split(/[,;]+/).map((a: string) => a.trim()).filter(Boolean);
    if (!auditoires.length) return null;
    let total = 0;
    let atLeastOne = false;
    for (const aud of auditoires) {
      const k = aud.toLowerCase();
      if (contraintesAuditoires[k] !== undefined) {
        total += contraintesAuditoires[k];
        atLeastOne = true;
      }
    }
    if (atLeastOne && total > 0 && auditoires.every(aud => contraintesAuditoires[aud.toLowerCase()] !== undefined)) {
      return total;
    }
    // Si aucune info trouvée pour ces auditoires, on retourne null pour afficher ?
    return null;
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Helper to safely get the object form of `row.data`
  function asRowDataObject(data: any): Record<string, any> {
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, any>;
    try {
      if (typeof data === "string") {
        // attempt parse, fallback to {}
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  }

  // Helper pour parser une valeur date et la transformer en Date JS (pour tri)
  function parseDateChrono(val: any): Date | null {
    if (!val) return null;
    // Gérer différents formats (Excel serial, YYYY-MM-DD, etc.)
    if (typeof val === "number" || /^\d+(\.\d+)?$/.test(val)) {
      // Excel serial date (nombre)
      // Excel epoch = 1899-12-30
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + Number(val) * 24 * 60 * 60 * 1000);
    }
    if (typeof val === "string") {
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val);
      }
      // DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split("/");
        return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      }
      // DD-MM-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(val)) {
        const [d, m, y] = val.split("-");
        return new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      }
      // cas fallback : tente de parser
      const date = new Date(val);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  }

  let columns: string[] = [];
  if (rows[0]) {
    const dataCols = Object.keys(asRowDataObject(rows[0].data || {}));
    // Nouvelle logique : injecter Durée juste après Fin
    // On prend le tableau trouvé, puis on ajuste Durée
    const indexFin = dataCols.findIndex(
      c =>
        ["Fin", "Heure_fin", "heure_fin"].includes(c)
    );
    let colsForDisplay = [...dataCols];
    // Si Durée existe, place-la juste après Fin si possible
    const dureeCandidate = dataCols.find(c => ["Duree", "Durée", "duree"].includes(c));
    if (dureeCandidate) {
      // Retire Durée de sa place actuelle
      colsForDisplay = colsForDisplay.filter(c => c !== dureeCandidate);
      // Place juste après Fin (ou à la fin si Fin n'existe pas)
      if (indexFin !== -1) {
        colsForDisplay.splice(indexFin + 1, 0, dureeCandidate);
      } else {
        colsForDisplay.push(dureeCandidate);
      }
    }
    columns = IDEAL_COL_ORDER.filter(c => colsForDisplay.includes(c))
      .concat(colsForDisplay.filter(c => !IDEAL_COL_ORDER.includes(c)));
  }

  const filteredRows = rows.filter(row => {
    if (!searchTerm.trim()) return true;
    const rowDataObject = asRowDataObject(row.data);
    const globalString = [
      ...columns.map(col => rowDataObject?.[col]?.toString() ?? ""),
      row.statut,
      (getExamProblem(row).join(", ")),
    ].join(" ").toLowerCase();
    return globalString.includes(searchTerm.toLowerCase());
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortBy) return 0;
    const dataA = asRowDataObject(a.data);
    const dataB = asRowDataObject(b.data);

    // DÉTECTION DU TRI PAR DATE CHRONOLOGIQUE
    if (
      ["Jour", "Date", "date_examen"].includes(sortBy)
      // On pourrait étendre ici selon le mapping
    ) {
      const dateA = parseDateChrono(dataA?.[sortBy]);
      const dateB = parseDateChrono(dataB?.[sortBy]);
      if (dateA && dateB) {
        return sortAsc ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      if (dateA && !dateB) return sortAsc ? -1 : 1;
      if (!dateA && dateB) return sortAsc ? 1 : -1;
      return 0;
    }

    const valA =
      sortBy === "État"
        ? getExamProblem(a).join("")
        : dataA?.[sortBy] ?? "";
    const valB =
      sortBy === "État"
        ? getExamProblem(b).join("")
        : dataB?.[sortBy] ?? "";
    if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
      return sortAsc
        ? parseFloat(valA) - parseFloat(valB)
        : parseFloat(valB) - parseFloat(valA);
    }
    return sortAsc
      ? valA.toString().localeCompare(valB.toString())
      : valB.toString().localeCompare(valA.toString());
  });

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  }

  function getDureeAffichee(val: any) {
    // Conversion au même format que début/fin
    return excelTimeToHHMM(val);
  }

  const handleEdit = (id: string, data: any) => {
    // If passed a string data by accident, always convert to object!
    setEditRow(id);
    setEditData(asRowDataObject(data));
  };

  const handleChangeEdit = (col: string, value: any) => {
    setEditData({ ...editData, [col]: value });
  };

  const handleSave = async (id: string) => {
    await updateMutation.mutateAsync({ id, data: editData, statut: "NON_TRAITE", erreurs: null });
    setEditRow(null);
    setEditData({});
    toast({ title: "Ligne modifiée", description: "Modifications appliquées." });
  };

  const handleBatchValidate = async () => {
    setValidating(true);
    // On retire la contrainte "problème auditoire bloque la validation"
    // Avant : rowsToValidate = rows.filter(r => getExamProblem(r).length === 0 && r.statut === "NON_TRAITE");
    const rowsToValidate = rows.filter(r => r.statut === "NON_TRAITE"); // plus de check sur auditoire
    if (!rowsToValidate.length) {
      toast({ title: "Aucune ligne à valider", description: "Corrigez d'abord tous les examens." });
      setValidating(false);
      return;
    }
    await batchValidate.mutateAsync({ rowIds: rowsToValidate.map(r => r.id), statut: "VALIDE" });
    toast({ title: "Validation réussie", description: `${rowsToValidate.length} examens validés.` });
    setValidating(false);
  };

  // Ajout état pour la sélection multiple
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // Pour confirmation de suppression multiple
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Ajout de la suppression en masse (mutation simple, réutilise le delete existant)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("examens_import_temp").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
      toast({ title: "Examens supprimés", description: `${selectedRows.length} lignes supprimées.` });
      setSelectedRows([]);
      setBulkDeleteOpen(false);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer la sélection." });
    }
  });

  // Nouvelle mutation pour mettre surveillants à 0 pour la sélection
  const setSurvThZeroMutation = useMutation({
    mutationFn: async (rowIds: string[]) => {
      // Pour chaque ligne, upsert/patch data.Surveillants_Th à 0 en base
      for (const id of rowIds) {
        const { data: rowObj } = rows.find(r => r.id === id) ?? {};
        const updatedData = {
          ...(rowObj?.data || {}),
          Surveillants_Th: 0
        };
        const { error } = await supabase
          .from("examens_import_temp")
          .update({ data: updatedData, statut: "NON_TRAITE", erreurs: null })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examens-import-temp"] });
      toast({ title: "Mise à jour réalisée", description: "Les surveillants ont été mis à 0 pour la sélection." });
      setSelectedRows([]);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à zéro la sélection." });
      setSelectedRows([]);
    }
  });

  // Sélection/désélection d'une ligne
  function handleSelectRow(id: string, checked: boolean) {
    setSelectedRows(prev =>
      checked ? [...prev, id] : prev.filter(rowId => rowId !== id)
    );
  }

  // Sélection/désélection tout
  function handleSelectAll(checked: boolean, ids: string[]) {
    setSelectedRows(checked ? ids : []);
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Révision des examens importés</CardTitle>
        <CardDescription>
          Corrigez les examens avec des champs obligatoires vides (ex : faculté).<br />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExamensImportTable
          rows={sortedRows.map(r => ({
            ...r,
            // Always ensure .data is an object for table/row sub-components
            data: asRowDataObject(r.data)
          }))}
          columns={columns}
          editRow={editRow}
          editData={editData}
          onEdit={handleEdit}
          onChangeEdit={handleChangeEdit}
          onSave={handleSave}
          onDelete={setDeleteRowId}
          deleteRowId={deleteRowId}
          deleteMutation={deleteMutation}
          getExamProblem={getExamProblem}
          getSurvTh={getSurvTh}
          excelTimeToHHMM={excelTimeToHHMM}
          excelDateString={excelDateString}
          getDureeAffichee={getDureeAffichee}
          validating={validating}
          handleBatchValidate={handleBatchValidate}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          sortAsc={sortAsc}
          handleSort={handleSort}
          totalRowsCount={rows.length}
          selectedRows={selectedRows}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          allRowIds={sortedRows.map(r => r.id)}
        />
        {/* Boutons action de masse */}
        <div className="mt-4 flex gap-4">
          <Button
            variant="destructive"
            disabled={selectedRows.length === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            Supprimer la sélection ({selectedRows.length})
          </Button>
          {/* Action mettre surveillants à 0 */}
          <Button
            variant="outline"
            disabled={selectedRows.length === 0 || setSurvThZeroMutation.isPending}
            onClick={() => setSurvThZeroMutation.mutate(selectedRows)}
          >
            Mettre surveillants à 0
          </Button>
        </div>
        {/* Dialog de confirmation */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la sélection</AlertDialogTitle>
              <AlertDialogDescription>
                Confirmez-vous la suppression de {selectedRows.length} examen{selectedRows.length > 1 ? "s" : ""} ? <br />
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDeleteMutation.mutate(selectedRows)}
                disabled={bulkDeleteMutation.isPending}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
