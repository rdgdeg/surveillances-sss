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

// <--- utilitaires d'affichage heures/date/durée (inchangé)
function excelTimeToHHMM(t: any): string {
  if (typeof t === "number") {
    const totalMinutes = Math.round(t * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  if (typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t.trim())) {
    return t.trim();
  }
  return t?.toString() || "";
}

function excelDateString(d: any): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    // déjà en forme YYYY-MM-DD
    return d.split("-").reverse().join("/");
  }
  if (typeof d === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    // déjà formaté
    return d;
  }
  return d?.toString() || "";
}

function excelDurationToHM(val: any): string {
  if (typeof val === "number") {
    // 0.0833 (Excel) => environ 5 min, 0.125 => 7.5 min, mais souvent durée = nombre d'heures (1.5 pour 1h30)
    // Essayons d'abord : 1 => 1:00, 1.5 => 1:30, 2 => 2:00
    const hours = Math.floor(val);
    const minutes = Math.round((val - hours) * 60);
    if (isNaN(hours) || isNaN(minutes)) return val.toString();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  return val?.toString() || "";
}

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

import { ExamensImportTable } from "./ExamensImportTable";

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

  function getExamProblem(row: any) {
    const { data } = row;
    const missing: string[] = [];
    if (!data['Auditoires'] && !data['auditoires'] && !data['salle']) missing.push("auditoire");
    if (!data['Faculte'] && !data['Faculté'] && !data['faculte'] && !data['faculté']) missing.push("faculté");
    return missing;
  }

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

  let columns: string[] = [];
  if (rows[0]) {
    const dataCols = Object.keys(rows[0].data || {});
    columns = IDEAL_COL_ORDER.filter(c => dataCols.includes(c));
    columns = columns.concat(dataCols.filter(c => !columns.includes(c)));
  }

  const filteredRows = rows.filter(row => {
    if (!searchTerm.trim()) return true;
    const globalString = [
      ...columns.map(col => row.data?.[col]?.toString() ?? ""),
      row.statut,
      (getExamProblem(row).join(", ")),
    ].join(" ").toLowerCase();
    return globalString.includes(searchTerm.toLowerCase());
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortBy) return 0;
    const valA =
      sortBy === "État"
        ? getExamProblem(a).join("")
        : a.data?.[sortBy] ?? "";
    const valB =
      sortBy === "État"
        ? getExamProblem(b).join("")
        : b.data?.[sortBy] ?? "";
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
    if (typeof val === "number") return excelDurationToHM(val);
    return val?.toString() ?? "";
  }

  const handleEdit = (id: string, data: any) => {
    setEditRow(id);
    setEditData(data);
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
    const rowsToValidate = rows.filter(r => getExamProblem(r).length === 0 && r.statut === "NON_TRAITE");
    if (!rowsToValidate.length) {
      toast({ title: "Aucune ligne à valider", description: "Corrigez d'abord tous les examens." });
      setValidating(false);
      return;
    }
    await batchValidate.mutateAsync({ rowIds: rowsToValidate.map(r => r.id), statut: "VALIDE" });
    toast({ title: "Validation réussie", description: `${rowsToValidate.length} examens validés.` });
    setValidating(false);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Révision des examens importés</CardTitle>
        <CardDescription>
          Corrigez les examens avec des champs obligatoires vides (ex : auditoire, faculté).<br />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExamensImportTable
          rows={sortedRows}
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
        />
      </CardContent>
    </Card>
  );
}
