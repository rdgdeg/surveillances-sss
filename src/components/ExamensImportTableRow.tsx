
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
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
}

export function ExamensImportTableRow({
  row, columns, editRow, editData, onEdit, onChangeEdit, onSave, onDelete, deleteRowId, deleteMutation,
  getExamProblem, getSurvTh, excelTimeToHHMM, excelDateString, getDureeAffichee
}: ExamensImportTableRowProps) {
  const problems = getExamProblem(row);
  const theorique = getSurvTh(row.data);

  return (
    <tr key={row.id} className={problems.length ? "bg-red-50" : ""}>
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
              // Pour Durée, utilise la valeur brute (plus de conversion)
              col === "Duree" || col === "Durée" || col === "duree"
                ? row.data?.[col]?.toString() ?? ""
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
          : <span className="text-red-700">?</span>
        }
      </td>
      <td>
        {problems.length === 0
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
