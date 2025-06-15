import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Save, Plus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomStatusModal } from "./CustomStatusModal";
import { FacultesMultiSelect, FACULTES_FILTERED } from "./FacultesMultiSelect";

// Liste FAUTES & AFFECTATIONS : inclus FSM + Autre
const FACULTES = [
  { value: "FASB", label: "FASB" },
  { value: "EPL", label: "EPL" },
  { value: "FIAL", label: "FIAL" },
  { value: "PSSP", label: "PSSP" },
  { value: "LSM", label: "LSM" },
  { value: "ESPO", label: "ESPO" },
  { value: "FSP", label: "FSP" },
  { value: "FSM", label: "FSM" },
  { value: "ASS", label: "ASS" },
  { value: "MEDE", label: "MEDE" },
  { value: "NONE", label: "Aucune restriction" },
  { value: "AUTRE", label: "Autre" }
];
// Liste statuts enrichie selon workflow + option ajout
const BASE_STATUTS = [
  "Jobiste", "Assistant", "Doctorant", "PAT", "PAT FASB", "Autres"
];

// Types
interface SurveillantJoin {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  statut: string;
  faculte_interdite?: string; // du Supabase (pour join), on reconstruit après en tableau
  affectation_fac?: string;
  campus?: string;
  eft?: number;
  // Session fields
  session_entry_id?: string;
  quota?: number | null;
}

// On reconstruit partout en interne avec ce type (toujours un tableau pour faculte_interdite)
type SurveillantJoinWithArray = Omit<SurveillantJoin, "faculte_interdite"> & {
  faculte_interdite: string[];
};

export function SurveillantUnifiedManager() {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<string | null>(null);
  // CORRECTION: Utilisation correcte de useState<...>()
  const [editValues, setEditValues] = useState<{
    etp?: number;
    quota?: number;
    faculte_interdite?: string[];
    statut?: string;
    affectation_fac?: string;
  }>({});
  const [showUpload, setShowUpload] = useState(false);
  const [customStatuts, setCustomStatuts] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const statutsDisponibles = [...BASE_STATUTS, ...customStatuts, "Ajouter..."];

  // 1. CHARGEMENT surveillants (jointure surveillant_sessions)
  const { data: surveillants, isLoading } = useQuery({
    queryKey: ["unified-surveillants", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      // jointure manuelle
      const { data, error } = await supabase
        .from("surveillant_sessions")
        .select(
          `
          id,
          surveillant_id,
          quota,
          surveillants (
            id,
            nom,
            prenom,
            email,
            type,
            statut,
            faculte_interdite,
            affectation_fac,
            campus,
            eft
          )
        `
        )
        .eq("session_id", activeSession.id)
        .order("surveillants(nom)", { ascending: true });

      if (error) throw error;

      // Adaptation: stocke faculte_interdite comme tableau.
      return (data ?? []).map((row: any) => ({
        id: row.surveillants.id,
        nom: row.surveillants.nom,
        prenom: row.surveillants.prenom,
        email: row.surveillants.email,
        type: row.surveillants.type,
        statut: row.surveillants.statut,
        // string|null > tableau (filtre "NONE" => [])
        faculte_interdite:
          row.surveillants.faculte_interdite && row.surveillants.faculte_interdite !== "NONE"
            ? row.surveillants.faculte_interdite.split(",").map((x: string) => x.trim())
            : [],
        affectation_fac: row.surveillants.affectation_fac,
        campus: row.surveillants.campus,
        eft: row.surveillants.eft ?? undefined,
        session_entry_id: row.id,
        quota: row.quota ?? null,
      })) as SurveillantJoinWithArray[];
    },
    enabled: !!activeSession?.id,
  });

  // 2. MUTATIONS : update ETP OU quota session 
  const updateSurveillantMutation = useMutation({
    mutationFn: async ({
      surveillantId,
      eft,
    }: {
      surveillantId: string;
      eft: number;
    }) => {
      const { error } = await supabase
        .from("surveillants")
        .update({ eft })
        .eq("id", surveillantId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "ETP mis à jour",
        description: "La valeur ETP a été modifiée.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateQuotaSessionMutation = useMutation({
    mutationFn: async ({
      sessionEntryId,
      quota,
    }: {
      sessionEntryId: string;
      quota: number;
    }) => {
      const { error } = await supabase
        .from("surveillant_sessions")
        .update({ quota })
        .eq("id", sessionEntryId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Quota session modifié",
        description: "Le quota session a été mis à jour.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Mise à jour pour accepter un tableau de facultés interdites et le convertir en string jointe
  const updateFaculteInterditeMutation = useMutation({
    mutationFn: async ({
      surveillantId,
      faculte_interdite,
    }: {
      surveillantId: string;
      faculte_interdite: string[];
    }) => {
      // Si aucune, stocker "NONE" ou null; sinon, join
      const value =
        !faculte_interdite || faculte_interdite.length === 0 || faculte_interdite.includes("NONE")
          ? null
          : faculte_interdite.join(",");
      const { error } = await supabase
        .from("surveillants")
        .update({ faculte_interdite: value })
        .eq("id", surveillantId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Faculté interdite mise à jour",
        description: "La restriction a été prise en compte.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 3. MODIFICATION des valeurs via édition par ligne
  const handleEdit = (row: SurveillantJoinWithArray) => {
    setEditRow(row.id);
    setEditValues({
      etp: row.eft ?? 0,
      quota: row.quota ?? ((row.eft ?? 0) * 6),
      faculte_interdite: row.faculte_interdite.length > 0 ? row.faculte_interdite : ["NONE"],
      statut: row.statut,
      affectation_fac: row.affectation_fac ?? "",
    });
  };
  const handleCancel = () => {
    setEditRow(null);
    setEditValues({});
  };

  // handleSave adapté avec tableau
  const handleSave = async (row: SurveillantJoinWithArray) => {
    // Update ETP si changé
    if (editValues.etp !== row.eft) {
      await updateSurveillantMutation.mutateAsync({ surveillantId: row.id, eft: editValues.etp ?? 0 });
    }
    // Update quota session si changé
    if (editValues.quota !== row.quota && row.session_entry_id) {
      await updateQuotaSessionMutation.mutateAsync({
        sessionEntryId: row.session_entry_id,
        quota: editValues.quota ?? 0,
      });
    }
    // Faculté interdite
    const curr = Array.isArray(row.faculte_interdite) ? row.faculte_interdite : [];
    const next = editValues.faculte_interdite || [];
    if (next.join(",") !== curr.join(",")) {
      await updateFaculteInterditeMutation.mutateAsync({
        surveillantId: row.id,
        faculte_interdite: next,
      });
    }
    setEditRow(null);
    setEditValues({});
  };

  // 4. Fichier d'import surveillants (Excel) - ouverture
  // (À brancher vers un composant d'import Excel existant si besoin)
  // Pour la démo, on affiche juste un bouton
  const handleOpenUpload = () => setShowUpload(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle>Liste des surveillants</CardTitle>
            <CardDescription>
              Gérez tous les surveillants, ETP, quotas, restrictions de facultés, et import sur la session courante.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleOpenUpload}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Importer surveillants (Excel)
          </Button>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Affectation</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>ETP</TableHead>
                  <TableHead>Quota théorique<br /><span className="text-xs text-gray-400">(ETP × 6)</span></TableHead>
                  <TableHead>Quota session</TableHead>
                  <TableHead>
                    Faculté interdite
                    <span className="block text-xs text-gray-400 font-normal">Blocages attrib.</span>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              {/* Affichage du tableau */}
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12}>Chargement...</TableCell>
                  </TableRow>
                ) : surveillants && surveillants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">Aucun surveillant trouvé</TableCell>
                  </TableRow>
                ) : (
                  surveillants?.map((row) => {
                    const isEdit = editRow === row.id;

                    // Calcul correctement le quota théorique selon le statut
                    // (Assistant -> ETP * 6, PAT/Doctorant/Jobiste/Autres -> 0)
                    let statut = isEdit ? editValues.statut ?? row.statut : row.statut;
                    let etp = isEdit ? editValues.etp ?? row.eft ?? 0 : row.eft ?? 0;

                    const quotaTheorique = (() => {
                      if (!statut) return 0;
                      // Normalisation minuscule pour plus de robustesse
                      switch (statut.toLowerCase()) {
                        case "assistant":
                        case "pat fasb": // Certains statuts peuvent être PAT FASB (0, pour suivre consigne)
                          return Math.round(Number(etp) * 6);
                        case "pat":
                        case "doctorant":
                        case "jobiste":
                          return 0;
                        default:
                          return 0; // Pour tout autre cas, à adapter si consignes changent
                      }
                    })();

                    // Correction de la propagation du type pour handleEdit et handleSave
                    const selectedFacs = isEdit
                      ? editValues.faculte_interdite ?? ["NONE"]
                      : row.faculte_interdite.length > 0
                        ? row.faculte_interdite
                        : ["NONE"];

                    return (
                      <TableRow key={row.id} className={isEdit ? 'bg-blue-50' : undefined}>
                        <TableCell>{row.nom}</TableCell>
                        <TableCell>{row.prenom}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          {isEdit ? (
                            <select
                              className="w-28 rounded-md border px-2 py-1 text-sm"
                              value={editValues.statut ?? row.statut}
                              onChange={e => {
                                if (e.target.value === "Ajouter...") {
                                  setModalOpen(true);
                                } else {
                                  setEditValues(v => ({ ...v, statut: e.target.value }));
                                }
                              }}
                            >
                              {statutsDisponibles.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant="outline">{row.statut}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <select
                              className="w-24 rounded-md border px-2 py-1 text-sm"
                              value={editValues.affectation_fac ?? row.affectation_fac ?? ""}
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  affectation_fac: e.target.value
                                }))
                              }
                            >
                              <option value="">Aucune</option>
                              {FACULTES.filter(f => f.value !== "NONE").map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                          ) : (
                            row.affectation_fac || "-"
                          )}
                        </TableCell>
                        <TableCell>{row.campus || "-"}</TableCell>
                        <TableCell>
                          {isEdit ? (
                            <Input
                              type="number"
                              className="w-20"
                              value={editValues.etp ?? ""}
                              step="0.01"
                              min="0"
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  etp: parseFloat(e.target.value),
                                }))
                              }
                            />
                          ) : (
                            row.eft ?? "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block px-3 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 min-w-[2.7rem] text-center">
                            {quotaTheorique}
                          </span>
                          <div className="text-[10px] text-gray-400 leading-tight text-center">ETP × 6</div>
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <Input
                              type="number"
                              className="w-20"
                              value={editValues.quota ?? ""}
                              min="0"
                              onChange={e =>
                                setEditValues(v => ({
                                  ...v,
                                  quota: parseInt(e.target.value) || 0,
                                }))
                              }
                            />
                          ) : (
                            row.quota ?? "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <FacultesMultiSelect
                              values={selectedFacs}
                              onChange={(v) => setEditValues((vals) => ({ ...vals, faculte_interdite: v }))}
                              disabled={updateFaculteInterditeMutation.isPending}
                            />
                          ) : Array.isArray(selectedFacs) && selectedFacs.length > 0 && !selectedFacs.includes("NONE") ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {selectedFacs.map((f) => (
                                <span key={f} className="inline-block bg-red-100 text-red-700 rounded px-2 text-xs">
                                  {FACULTES_FILTERED.find(x => x.value === f)?.label || f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Aucune restriction</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEdit ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSave(row)}
                                disabled={updateSurveillantMutation.isPending || updateQuotaSessionMutation.isPending || updateFaculteInterditeMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleCancel}
                                disabled={updateSurveillantMutation.isPending || updateQuotaSessionMutation.isPending || updateFaculteInterditeMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
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
        </CardContent>

        {/* Section Import - à brancher avec l'import Excel existant si souhaité */}
        {showUpload && (
          <Card>
            <CardHeader>
              <CardTitle>Importer des surveillants</CardTitle>
              <CardDescription>
                Sélectionnez un fichier Excel pour mettre à jour la liste.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* À remplacer par ton FileUploader existant */}
              <div className="flex gap-4">
                <Input type="file" accept=".xlsx,.xls" />
                <Button variant="outline" onClick={() => setShowUpload(false)}>Fermer</Button>
              </div>
              <div className="mt-2 text-xs text-muted">
                Fonctionnalité à connecter à ton composant d'import.
              </div>
            </CardContent>
          </Card>
        )}

        {/* MODALE AJOUT STATUT */}
        <CustomStatusModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={s => setCustomStatuts(l => [...l, s])}
        />
      </Card>
    </div>
  );
}
