
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChangeEvent } from "react";
import { Delete } from "lucide-react";

interface ExamensImportTableRowProps {
  row: any;
  columns: string[];
  editRow: string|null;
  editData: any;
  onEdit: (id: string, data: any) => void;
  onChangeEdit: (col: string, value: any) => void;
  onSave: (id: string) => void;
  onDelete: (id: string|null) => void;
  deleteRowId?: string|null;
  deleteMutation?: any;
  getExamProblem: (row: any) => string[];
  getSurvTh: (data: any) => number|null;
  excelTimeToHHMM: (t: any) => string;
  excelDateString: (d: any) => string;
  getDureeAffichee: (val: any) => string;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export function ExamensImportTableRow({
  row, columns, editRow, editData, onEdit, onChangeEdit, onSave, onDelete, deleteRowId, deleteMutation,
  getExamProblem, getSurvTh, excelTimeToHHMM, excelDateString, getDureeAffichee,
  isSelected, onSelect
}: ExamensImportTableRowProps) {
  const [inlineEditSurvThId, setInlineEditSurvThId] = useState<string|null>(null);
  const [inlineSurvThValue, setInlineSurvThValue] = useState<string>("");

  const problems = getExamProblem(row);

  // Champs auditoire
  const auditoireField = row.data?.["Auditoires"] || row.data?.["auditoires"] || row.data?.["salle"] || "";
  const noAuditoire = !auditoireField;

  // On regarde s'il y a une valeur "forcée" dans les data
  const forcedSurvTh = row.data?.Surveillants_Th;
  const calculatedSurvTh = getSurvTh(row.data);
  const theorique = forcedSurvTh !== undefined && forcedSurvTh !== null && forcedSurvTh !== ""
    ? Number(forcedSurvTh)
    : calculatedSurvTh;

  // Début affichage
  return (
    <tr key={row.id} className={problems.length ? "bg-red-50" : ""}>
      <td>
        <Checkbox
          checked={!!isSelected}
          onCheckedChange={(checked) => onSelect?.(row.id, !!checked)}
        />
      </td>
      <td>{row.indice + 1}</td>
      {columns.map(col => (
        <td key={col}>
          {editRow === row.id
            ? (
              <Input
                value={editData[col] ?? ""}
                className="text-xs"
                onChange={e => onChangeEdit(col, e.target.value)}
              />
            )
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
        {/* Inline edit */}
        {editRow === row.id ? (
          <Input
            type="number"
            min={0}
            className="text-xs w-16"
            value={
              editData.Surveillants_Th !== undefined && editData.Surveillants_Th !== null
                ? editData.Surveillants_Th
                : theorique ?? ""
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              onChangeEdit("Surveillants_Th", val);
            }}
            placeholder="?"
          />
        ) : inlineEditSurvThId === row.id ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              type="number"
              min={noAuditoire ? 0 : 1}
              className="text-xs w-16"
              value={inlineSurvThValue}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setInlineSurvThValue(e.target.value);
              }}
              onBlur={() => setInlineEditSurvThId(null)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (
                    inlineSurvThValue !== "" &&
                    !isNaN(Number(inlineSurvThValue))
                  ) {
                    onEdit(row.id, { ...row.data, Surveillants_Th: Number(inlineSurvThValue) });
                    // Save immediately
                    await onSave(row.id);
                  }
                  setInlineEditSurvThId(null);
                }
                if (e.key === "Escape") setInlineEditSurvThId(null);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="px-2"
              onClick={async () => {
                if (
                  inlineSurvThValue !== "" &&
                  !isNaN(Number(inlineSurvThValue))
                ) {
                  onEdit(row.id, { ...row.data, Surveillants_Th: Number(inlineSurvThValue) });
                  await onSave(row.id);
                }
                setInlineEditSurvThId(null);
              }}
            >
              OK
            </Button>
          </div>
        ) : theorique !== null && theorique !== undefined ? (
          <Badge
            className="bg-green-100 text-green-800 cursor-pointer"
            title="Cliquez pour éditer"
            onClick={() => {
              setInlineEditSurvThId(row.id);
              setInlineSurvThValue(theorique?.toString() ?? "0");
            }}
          >
            {theorique}
          </Badge>
        ) : (
          <span className="text-red-700 cursor-pointer" title="Cliquez pour éditer"
            onClick={() => {
              setInlineEditSurvThId(row.id);
              setInlineSurvThValue("");
            }}>?</span>
        )}
      </td>
      <td>
        {noAuditoire ? (
          <Badge className="bg-orange-100 text-orange-800">Auditoire à compléter</Badge>
        ) : problems.length === 0
          ? <Badge className="bg-green-100 text-green-800">Prêt</Badge>
          : <Badge className="bg-orange-100 text-orange-800">À corriger: {problems.join(", ")}</Badge>
        }
      </td>
      <td>
        {editRow === row.id
          ? <Button size="sm" variant="outline" onClick={() => onSave(row.id)}>Enregistrer</Button>
          : <Button size="sm" variant="ghost" onClick={() => onEdit(row.id, row.data)}>Éditer</Button>
        }
      </td>
      <td>
        <AlertDialog open={deleteRowId === row.id} onOpenChange={open => { if (!open) onDelete(null); }}>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="destructive"
              title="Supprimer la ligne"
              onClick={() => onDelete(row.id)}
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
                onClick={() => deleteMutation?.mutate(row.id)}
                disabled={deleteMutation?.isPending}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}
