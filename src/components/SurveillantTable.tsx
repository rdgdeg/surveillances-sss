
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Save, X, Plus } from "lucide-react";
import { FacultesMultiSelect, FACULTES_FILTERED } from "./FacultesMultiSelect";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  faculte_interdite: string[];
  affectation_fac?: string;
  campus?: string;
  eft?: number;
  date_fin_contrat?: string | null;
  session_entry_id?: string;
  quota?: number | null;
  is_active: boolean;
}

interface SurveillantTableProps {
  rows: Surveillant[];
  editRow: string | null;
  editValues: any;
  isLoading: boolean;
  selectedRows: string[];
  onEdit: (row: Surveillant) => void;
  onEditChange: (val: any) => void;
  onSave: (row: Surveillant) => void;
  onCancel: () => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onToggleActive: (sessionEntryId: string, is_active: boolean) => void;
  statutsDisponibles: string[];
  modalOpen: boolean;
  setModalOpen: (b: boolean) => void;
  hasSessionEntryId?: boolean;
  compact?: boolean;
}

// Calcul quota théorique par type (corrigé)
function getTheoreticalQuota(type: string | undefined, etp: number | undefined | null): number {
  if (!type) return 0;
  const typeNorm = type.trim().toLowerCase();
  if (typeNorm === "assistant") return Math.round(Number(etp || 0) * 6);
  if (typeNorm === "pat" || typeNorm === "pat fasb") return Math.round(Number(etp || 0) * 12);
  return 0;
}

export function SurveillantTable({
  rows, editRow, editValues, isLoading, selectedRows,
  onEdit, onEditChange, onSave, onCancel, onSelectRow, onToggleActive,
  statutsDisponibles, modalOpen, setModalOpen,
  hasSessionEntryId = true
}: SurveillantTableProps) {
  return (
    <div className="w-full max-w-[1700px] mx-auto overflow-x-visible"> {/* Largeur max élargie */}
      <Table className="w-full min-w-[1200px]">
        <TableHeader>
          <TableRow className="bg-blue-100 text-xs">
            <TableHead className="w-7 px-3 py-1" />
            <TableHead className="min-w-[170px] w-48 p-2">Nom</TableHead>
            <TableHead className="min-w-[200px] w-60 p-2">Email</TableHead>
            <TableHead className="w-16 p-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>Actif</span>
                  </TooltipTrigger>
                  <TooltipContent>Actif pour la session</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="w-14 p-2">Type</TableHead>
            <TableHead className="w-20 p-2">Statut</TableHead>
            <TableHead className="w-16 p-2">Affect.</TableHead>
            <TableHead className="w-11 p-2">ETP</TableHead>
            <TableHead className="w-11 p-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>Q.th.</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Quota théorique (Assistant = ETP×6, PAT = ETP×12)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableHead>
            <TableHead className="w-12 p-2">Quota</TableHead>
            <TableHead className="w-28 p-2">Restrictions</TableHead>
            <TableHead className="w-23 p-2">Fin contrat</TableHead>
            <TableHead className="w-16 p-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={13}>Chargement…</TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center">Aucun surveillant</TableCell>
            </TableRow>
          ) : (
            rows.map(row => {
              const isEdit = editRow === row.id;
              const isChecked = selectedRows.includes(row.id);
              const etp = isEdit ? editValues.etp ?? row.eft ?? 0 : row.eft ?? 0;
              const quotaTheorique = getTheoreticalQuota(row.type, etp);
              const selectedFacs = isEdit
                ? editValues.faculte_interdite ?? ["NONE"]
                : row.faculte_interdite.length > 0
                  ? row.faculte_interdite
                  : ["NONE"];
              return (
                <TableRow key={row.id} className={isEdit ? "bg-blue-50" : undefined}>
                  <TableCell className="p-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => onSelectRow(row.id, e.target.checked)}
                      aria-label="Sélectionner"
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell className="font-medium p-2">
                    {row.nom} <span className="text-xs">{row.prenom}</span>
                  </TableCell>
                  <TableCell className="text-xs p-2">{row.email}</TableCell>
                  <TableCell className="p-2">
                    {hasSessionEntryId && row.session_entry_id && row.quota !== undefined ? (
                      isEdit ? (
                        <span>{row.is_active ? "Actif" : "Désactivé"}</span>
                      ) : (
                        <Button
                          size="sm"
                          variant={row.is_active ? "secondary" : "outline"}
                          className={
                            row.is_active
                              ? "bg-emerald-100 text-emerald-700 h-7 px-4 font-semibold"
                              : "bg-red-100 text-red-700 h-7 px-4 font-semibold"
                          }
                          onClick={() => onToggleActive(row.session_entry_id!, !row.is_active)}
                        >
                          {row.is_active ? "Actif" : "Désactivé"}
                        </Button>
                      )
                    ) : (<span>-</span>)}
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge variant="outline" className="px-2 py-0.5 text-xs">{row.type}</Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    {isEdit ? (
                      <select
                        className="w-20 rounded border px-1 py-0.5 text-xs"
                        value={editValues.statut ?? row.statut}
                        onChange={e => {
                          if (e.target.value === "Ajouter...") setModalOpen(true);
                          else onEditChange({ ...editValues, statut: e.target.value });
                        }}
                      >
                        {statutsDisponibles.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="outline" className="px-2 py-0.5 text-xs">{row.statut}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-xs">
                    {isEdit ? (
                      <select
                        className="w-20 rounded border px-1 py-0.5 text-xs"
                        value={editValues.affectation_fac ?? row.affectation_fac ?? ""}
                        onChange={e =>
                          onEditChange({ ...editValues, affectation_fac: e.target.value })
                        }
                      >
                        <option value="">Aucune</option>
                        {FACULTES_FILTERED.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    ) : (
                      row.affectation_fac || "-"
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {isEdit ? (
                      <Input
                        type="number"
                        className="w-11 h-7 text-xs"
                        value={editValues.etp ?? ""}
                        step="0.01"
                        min="0"
                        onChange={e =>
                          onEditChange({ ...editValues, etp: parseFloat(e.target.value) })
                        }
                      />
                    ) : (
                      row.eft ?? "-"
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <span className="inline-block px-2 text-xs font-bold bg-gray-100 text-gray-700 rounded min-w-[2.3rem] text-center">
                      {quotaTheorique}
                    </span>
                  </TableCell>
                  <TableCell className="p-2">
                    {isEdit ? (
                      <Input
                        type="number"
                        className="w-12 h-7 text-xs"
                        value={editValues.quota ?? ""}
                        min="0"
                        onChange={e =>
                          onEditChange({ ...editValues, quota: parseInt(e.target.value) || 0 })
                        }
                      />
                    ) : (
                      row.quota ?? "-"
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {isEdit ? (
                      <FacultesMultiSelect
                        values={selectedFacs}
                        onChange={v => onEditChange({ ...editValues, faculte_interdite: v })}
                      />
                    ) : Array.isArray(selectedFacs) && selectedFacs.length > 0 && !selectedFacs.includes("NONE") ? (
                      <div className="flex flex-wrap gap-0.5 max-w-[6rem]">
                        {selectedFacs.map((f) => (
                          <span key={f} className="bg-red-100 text-red-700 rounded px-1 text-xs">{FACULTES_FILTERED.find(x => x.value === f)?.label || f}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="p-2 text-xs">
                    {row.date_fin_contrat ? new Date(row.date_fin_contrat).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="p-2">
                    {isEdit ? (
                      <>
                        <Button size="sm" variant="default" onClick={() => onSave(row)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={onCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
