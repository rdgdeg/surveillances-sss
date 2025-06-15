
import { ExamensImportTableRow } from "./ExamensImportTableRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ExamensImportTableProps {
  rows: any[];
  columns: string[];
  editRow: string|null;
  editData: any;
  onEdit: (id: string, data: any) => void;
  onChangeEdit: (col: string, value: any) => void;
  onSave: (id: string) => void;
  onDelete: (id: string|null) => void;
  deleteRowId: string|null;
  deleteMutation: any;
  getExamProblem: (row: any) => string[];
  getSurvTh: (data: any) => number|null;
  excelTimeToHHMM: (t: any) => string;
  excelDateString: (d: any) => string;
  getDureeAffichee: (val: any) => string;
  validating: boolean;
  handleBatchValidate: () => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  sortBy: string|null;
  sortAsc: boolean;
  handleSort: (col: string) => void;
  totalRowsCount: number;
}

export function ExamensImportTable({
  rows, columns, editRow, editData, onEdit, onChangeEdit, onSave, onDelete, deleteRowId, deleteMutation,
  getExamProblem, getSurvTh, excelTimeToHHMM, excelDateString, getDureeAffichee,
  validating, handleBatchValidate, searchTerm, setSearchTerm,
  sortBy, sortAsc, handleSort, totalRowsCount
}: ExamensImportTableProps) {

  return (
    <div>
      <div className="mb-2 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Rechercher dans tous les examens..."
          className="w-full sm:w-96"
        />
        <span className="ml-auto text-xs text-gray-500">
          {rows.length} / {totalRowsCount} affichés
        </span>
      </div>
      {totalRowsCount === 0 && <div>Aucune donnée à réviser.</div>}
      {totalRowsCount > 0 && (
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
              {rows.map((row, idx) => (
                <ExamensImportTableRow
                  key={row.id}
                  row={{ ...row, indice: idx }}
                  columns={columns}
                  editRow={editRow}
                  editData={editData}
                  onEdit={onEdit}
                  onChangeEdit={onChangeEdit}
                  onSave={onSave}
                  onDelete={onDelete}
                  deleteRowId={deleteRowId}
                  deleteMutation={deleteMutation}
                  getExamProblem={getExamProblem}
                  getSurvTh={getSurvTh}
                  excelTimeToHHMM={excelTimeToHHMM}
                  excelDateString={excelDateString}
                  getDureeAffichee={getDureeAffichee}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <Button onClick={handleBatchValidate} disabled={validating}>
              {validating ? "Validation en cours..." : "Valider tous les examens prêts"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
