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
    onError: (error: any) => {
      toast({ title: "Erreur", description: "Impossible de supprimer la ligne." });
    }
  });

  // Champs obligatoires à contrôler (corrigez ici selon vos colonnes)
  function getExamProblem(row: any) {
    const { data } = row;
    const missing: string[] = [];
    if (!data['Auditoires'] && !data['auditoires'] && !data['salle']) missing.push("auditoire");
    if (!data['Faculte'] && !data['Faculté'] && !data['faculte'] && !data['faculté']) missing.push("faculté");
    return missing;
  }

  // Calcule les surveillants théoriques même pour plusieurs auditoires séparés par virgule (ou point-virgule)
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

  // Correction inline
  function EditableCell({ row, col }: { row: any, col: string }) {
    if (editRow === row.id) {
      return (
        <Input
          value={editData[col] ?? ""}
          className="text-xs"
          onChange={e => setEditData({ ...editData, [col]: e.target.value })}
        />
      );
    }
    // Ici : formatage si colonne = heure, date…
    if (["Debut", "Heure_debut", "heure_debut"].includes(col)) return <span>{excelTimeToHHMM(row.data?.[col])}</span>;
    if (["Fin", "Heure_fin", "heure_fin"].includes(col)) return <span>{excelTimeToHHMM(row.data?.[col])}</span>;
    if (["Jour", "Date", "date_examen"].includes(col)) return <span>{excelDateString(row.data?.[col])}</span>;
    if (["Duree", "Durée", "duree"].includes(col)) return <span>{excelDurationToHM(row.data?.[col])}</span>;
    return <span>{row.data?.[col]?.toString() ?? ""}</span>;
  }

  // Calcule la liste des colonnes
  let columns: string[] = [];
  if (rows[0]) {
    const dataCols = Object.keys(rows[0].data || {});
    columns = IDEAL_COL_ORDER.filter(c => dataCols.includes(c));
    columns = columns.concat(dataCols.filter(c => !columns.includes(c)));
  }

  // Appliquer la recherche sur toutes les colonnes concaténées
  const filteredRows = rows.filter(row => {
    if (!searchTerm.trim()) return true;
    const globalString = [
      ...columns.map(col => row.data?.[col]?.toString() ?? ""),
      row.statut,
      (getExamProblem(row).join(", ")),
    ].join(" ").toLowerCase();
    return globalString.includes(searchTerm.toLowerCase());
  });

  // Gestion du tri sur la colonne sélectionnée
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortBy) return 0;
    const valA =
      sortBy === "État"
        ? getExamProblem(a).join("") // On classe "État" sur le nombre de problèmes
        : a.data?.[sortBy] ?? "";
    const valB =
      sortBy === "État"
        ? getExamProblem(b).join("")
        : b.data?.[sortBy] ?? "";
    // Gestion nombre/texte
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

  // Correction : la colonne Duree affiche la valeur brute, sauf si nombre Excel
  function getDureeAffichee(val: any) {
    if (typeof val === "number") return excelDurationToHM(val);
    return val?.toString() || "";
  }

  const handleEdit = (id: string, data: any) => {
    setEditRow(id);
    setEditData(data);
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
        <div className="mb-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher dans tous les examens..."
            className="w-full sm:w-96"
          />
          <span className="ml-auto text-xs text-gray-500">
            {sortedRows.length} / {rows.length} affichés
          </span>
        </div>
        {rows.length === 0 && <div>Aucune donnée à réviser.</div>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map(col => (
                    <th
                      key={col}
                      className="cursor-pointer select-none hover:underline"
                      onClick={() => handleSort(col)}
                    >
                      {col}
                      {sortBy === col && (
                        <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </th>
                  ))}
                  <th
                    className="cursor-pointer select-none hover:underline"
                    onClick={() => handleSort("Surveillants théoriques")}
                  >
                    Surveillants théoriques
                    {sortBy === "Surveillants théoriques" && (
                      <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th
                    className="cursor-pointer select-none hover:underline"
                    onClick={() => handleSort("État")}
                  >
                    État
                    {sortBy === "État" && (
                      <span className="ml-1">{sortAsc ? "▲" : "▼"}</span>
                    )}
                  </th>
                  <th colSpan={2}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const problems = getExamProblem(row);
                  const theorique = getSurvTh(row.data);
                  return (
                    <tr key={row.id} className={problems.length ? "bg-red-50" : ""}>
                      <td>{idx + 1}</td>
                      {columns.map(col => (
                        <td key={col}>
                          {editRow === row.id
                            ? <EditableCell row={row} col={col} />
                            : (
                              col === "Duree" || col === "Durée" || col === "duree"
                                ? getDureeAffichee(row.data?.[col])
                                : ["Debut", "Heure_debut", "heure_debut"].includes(col)
                                  ? excelTimeToHHMM(row.data?.[col])
                                  : ["Fin", "Heure_fin", "heure_fin"].includes(col)
                                    ? excelTimeToHHMM(row.data?.[col])
                                    : ["Jour", "Date", "date_examen"].includes(col)
                                      ? excelDateString(row.data?.[col])
                                      : row.data?.[col]?.toString() ?? ""
                            )}
                        </td>
                      ))}
                      <td>
                        {theorique !== null && theorique !== undefined
                          ? <Badge className="bg-green-100 text-green-800">{theorique}</Badge>
                          : <span className="text-red-700">?</span>}
                      </td>
                      <td>
                        {problems.length === 0
                          ? <Badge className="bg-green-100 text-green-800">Prêt</Badge>
                          : <Badge className="bg-orange-100 text-orange-800">À corriger: {problems.join(", ")}</Badge>
                        }
                      </td>
                      <td>
                        {editRow === row.id
                          ? <Button size="sm" variant="outline" onClick={() => handleSave(row.id)}>Enregistrer</Button>
                          : <Button size="sm" variant="ghost" onClick={() => handleEdit(row.id, row.data)}>Éditer</Button>
                        }
                      </td>
                      <td>
                        <AlertDialog open={deleteRowId === row.id} onOpenChange={open => { if (!open) setDeleteRowId(null); }}>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="destructive"
                              title="Supprimer la ligne"
                              onClick={() => setDeleteRowId(row.id)}
                            >
                              <Delete className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous vraiment supprimer cette ligne ?<br />
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(row.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <Button onClick={handleBatchValidate} disabled={validating}>
                {validating ? "Validation en cours..." : "Valider tous les examens prêts"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
