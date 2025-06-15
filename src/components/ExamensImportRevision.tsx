
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExamensImportTemp, useUpdateExamenImportTemp, useBatchValidateExamensImport } from "@/hooks/useExamensImportTemp";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";

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

  // Calcule les surveillants théoriques même pour plusieurs auditoires séparés par virgule
  function getSurvTh(data: any) {
    const audString =
      data["Auditoires"] ||
      data["auditoires"] ||
      data["salle"] ||
      "";
    if (!audString || !contraintesAuditoires) return null;
    // On supporte plusieurs auditoires séparés par des virgules ou des points-virgules
    const auditoires = audString.split(/[,;]+/).map((a: string) => a.trim()).filter(Boolean);
    if (!auditoires.length) return null;
    let total = 0;
    let atLeastOne = false;
    auditoires.forEach((aud: string) => {
      const k = aud.toLowerCase();
      if (contraintesAuditoires[k]) {
        total += contraintesAuditoires[k];
        atLeastOne = true;
      } else {
        // Fallback : 1 si la contrainte n'est pas trouvée, mais on veut voir le ?, donc on ne compte pas dans le total
      }
    });
    // S'il manque au moins une valeur, juste afficher ?
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
    return <span>{row.data?.[col]?.toString() ?? ""}</span>;
  }

  // Pour forcer l'ordre des colonnes (heure_debut, heure_fin…)
  let columns: string[] = rows[0] ? Object.keys(rows[0].data || {}) : [];
  // Manipule l'ordre si les champs existent
  if (columns.length > 0) {
    const debutIdx = columns.findIndex(c => c.toLowerCase().includes("heure_debut"));
    const finIdx = columns.findIndex(c => c.toLowerCase().includes("heure_fin"));
    const orderedCols: string[] = [];
    if (debutIdx !== -1) {
      orderedCols.push(columns[debutIdx]);
    }
    if (finIdx !== -1) {
      orderedCols.push(columns[finIdx]);
    }
    columns.forEach((c, idx) => {
      if (idx !== debutIdx && idx !== finIdx) orderedCols.push(c);
    });
    columns = orderedCols;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Révision des examens importés</CardTitle>
        <CardDescription>
          Corrigez les examens avec des champs obligatoires vides (ex : auditoire, faculté).
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
                          : row.data?.[col]}</td>
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
