
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExamensImportTemp, useUpdateExamenImportTemp, useBatchValidateExamensImport } from "@/hooks/useExamensImportTemp";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";

// <--- AJOUT utilitaire pour formater les heures et durée
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
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [validating, setValidating] = useState(false);

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

  // Calcul : ordre idéal puis complète par autres champs
  let columns: string[] = [];
  if (rows[0]) {
    const dataCols = Object.keys(rows[0].data || {});
    columns = IDEAL_COL_ORDER.filter(c => dataCols.includes(c));
    // Ajoute les colonnes pas dans la liste idéale (pour pas en perdre)
    columns = columns.concat(dataCols.filter(c => !columns.includes(c)));
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Révision des examens importés</CardTitle>
        <CardDescription>
          Corrigez les examens avec des champs obligatoires vides (ex : auditoire, faculté).<br />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 && <div>Aucune donnée à réviser.</div>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map(col => <th key={col}>{col}</th>)}
                  <th>Surveillants théoriques</th>
                  <th>État</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const problems = getExamProblem(row);
                  const theorique = getSurvTh(row.data);
                  return (
                    <tr key={row.id} className={problems.length ? "bg-red-50" : ""}>
                      <td>{idx + 1}</td>
                      {columns.map(col => (
                        <td key={col}>{editRow === row.id
                          ? <EditableCell row={row} col={col} />
                          : (
                            // Affichage valeurs formatées pour les colonnes concernées
                            ["Debut", "Heure_debut", "heure_debut"].includes(col) ? excelTimeToHHMM(row.data?.[col])
                            : ["Fin", "Heure_fin", "heure_fin"].includes(col) ? excelTimeToHHMM(row.data?.[col])
                            : ["Jour", "Date", "date_examen"].includes(col) ? excelDateString(row.data?.[col])
                            : ["Duree", "Durée", "duree"].includes(col) ? excelDurationToHM(row.data?.[col])
                            : row.data?.[col]?.toString() ?? ""
                          )}</td>
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

