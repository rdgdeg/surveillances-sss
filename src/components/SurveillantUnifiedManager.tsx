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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  /** AJOUTER date_fin_contrat */
  date_fin_contrat?: string | null;
  // Session fields
  session_entry_id?: string;
  quota?: number | null;
  is_active?: boolean;
}

// On reconstruit partout en interne avec ce type (toujours un tableau pour faculte_interdite)
type SurveillantJoinWithArray = Omit<SurveillantJoin, "faculte_interdite"> & {
  faculte_interdite: string[];
  /** AJOUT date_fin_contrat pour TypeScript */
  date_fin_contrat?: string | null;
  is_active: boolean;
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
  const [activeTab, setActiveTab] = useState<"actifs" | "desactives">("actifs");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

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
          is_active,
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
            eft,
            date_fin_contrat
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
        date_fin_contrat: row.surveillants.date_fin_contrat ?? null, // AJOUT
        session_entry_id: row.id,
        quota: row.quota ?? null,
        is_active: row.is_active === undefined ? true : row.is_active, // NOUVEAU: récupère statut session
      })) as SurveillantJoinWithArray[];
    },
    enabled: !!activeSession?.id,
  });

  // 2. Calcule les surveillants actifs/désactivés pour affichage par onglet
  const surveillantsActifs = Array.isArray(surveillants)
    ? surveillants.filter(s => s.is_active)
    : [];
  const surveillantsDesactives = Array.isArray(surveillants)
    ? surveillants.filter(s => !s.is_active)
    : [];

  // 3. Sélection selon onglet actif
  const currentRows =
    activeTab === "actifs"
      ? surveillantsActifs
      : surveillantsDesactives;

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

  // --- SÉLECTION MULTIPLE ---
  // Gestion du bouton tout sélectionner
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRows(currentRows.map((r) => r.id));
    } else {
      setSelectedRows([]);
    }
  };
  // Sélection individuelle
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows((prev) =>
      checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)
    );
  };

  // Action de masse (activation/désactivation)
  const toggleActivationStatusMutation = useMutation({
    mutationFn: async ({
      surveillantIds,
      targetIsActive,
    }: {
      surveillantIds: string[];
      targetIsActive: boolean;
    }) => {
      // update surveillant_sessions SET is_active=targetIsActive
      // Attention : Il faut requêter surveillant_sessions (liaison session/surveillant)
      if (!activeSession) throw new Error("Session non sélectionnée");
      // Récupère les row surveillant_sessions à modifier
      const { data: sessionsRows, error } = await supabase
        .from("surveillant_sessions")
        .select("id, surveillant_id, is_active")
        .eq("session_id", activeSession.id)
        .in("surveillant_id", surveillantIds);
      if (error) throw error;
      const ids = (sessionsRows ?? []).map((row: any) => row.id);
      if (ids.length === 0) return;
      const { error: errorUpdate } = await supabase
        .from("surveillant_sessions")
        .update({ is_active: targetIsActive })
        .in("id", ids);
      if (errorUpdate) throw errorUpdate;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Statut modifié",
        description: "Les surveillants sélectionnés ont été mis à jour.",
      });
      setSelectedRows([]);
      setSelectAll(false);
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // CORRIGE : Calcule le quota théorique correctement selon le statut
  function getTheoreticalQuota(statut: string | undefined | null, etp: number | undefined | null): number {
    if (!statut) return 0;
    const statutNorm = (statut || "").toLowerCase();
    if (statutNorm === "assistant") return Math.round(Number(etp || 0) * 6);
    if (statutNorm === "pat fasb") return Math.round(Number(etp || 0) * 12);
    return 0;
  }

  // Barre d’actions pour sélection multiple
  const hasSelection = selectedRows.length > 0;

  // Ajout: gestion de mutation rapide activation/désactivation (par ligne)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ sessionEntryId, is_active }: { sessionEntryId: string, is_active: boolean }) => {
      const { error } = await supabase
        .from("surveillant_sessions")
        .update({ is_active })
        .eq("id", sessionEntryId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Statut d'activation modifié",
        description: "Le surveillant a été (dés)activé.",
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

  // Ajout : calculs pour tuiles récapitulatives
  const allRows = Array.isArray(surveillants) ? surveillants : [];
  const total = allRows.length;
  const actifs = allRows.filter(r => r.is_active).length;
  const inactifs = allRows.filter(r => !r.is_active).length;
  // Comptage par type + fallback "Inconnu"
  const typeMap = allRows.reduce((acc: Record<string, number>, r) => {
    acc[r.type || "Inconnu"] = (acc[r.type || "Inconnu"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* --- TU Multiples Statistiques --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
        <div className="bg-blue-50 border rounded p-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Total surveillants</span>
          <span className="text-2xl font-bold text-uclouvain-blue">{total}</span>
        </div>
        <div className="bg-emerald-50 border rounded p-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Actifs</span>
          <span className="text-xl font-semibold text-emerald-700">{actifs}</span>
        </div>
        <div className="bg-red-50 border rounded p-3 flex flex-col items-center">
          <span className="text-xs text-gray-500 mb-1">Inactifs</span>
          <span className="text-xl font-semibold text-red-600">{inactifs}</span>
        </div>
        <div className="bg-gray-50 border rounded p-3 flex flex-col items-center col-span-2">
          <span className="text-xs text-gray-500 mb-1">Par type</span>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(typeMap).map(([typeName, count]) => (
              <span key={typeName} className="bg-gray-100 text-gray-700 rounded px-2 text-xs">{typeName}: {count}</span>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-1">Liste des surveillants</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Gérez tous les surveillants, ETP, quotas, restrictions de facultés, et import sur la session courante.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleOpenUpload}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Importer surveillants (Excel)
          </Button>
        </CardHeader>

        <CardContent>
          {/* --- BARRE ACTIONS SÉLECTION MULTIPLE --- */}
          {hasSelection && (
            <div className="flex items-center mb-2 gap-2 bg-blue-50 p-2 rounded">
              <span className="text-sm text-gray-700">
                {selectedRows.length} surveillant{selectedRows.length > 1 ? "s" : ""} sélectionné{selectedRows.length > 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  toggleActivationStatusMutation.mutate({
                    surveillantIds: selectedRows,
                    targetIsActive: true,
                  })
                }
                disabled={toggleActivationStatusMutation.isPending}
              >
                Activer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toggleActivationStatusMutation.mutate({
                    surveillantIds: selectedRows,
                    targetIsActive: false,
                  })
                }
                disabled={toggleActivationStatusMutation.isPending}
              >
                Désactiver
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedRows([]);
                  setSelectAll(false);
                }}
                title="Effacer la sélection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Onglets "actifs"/"désactivés" */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "actifs" | "desactives")}>
            <TabsList className="mb-4">
              <TabsTrigger value="actifs">Surveillants actifs</TabsTrigger>
              <TabsTrigger value="desactives">Surveillants désactivés</TabsTrigger>
            </TabsList>
            <TabsContent value="actifs">
              <div className="overflow-x-auto border rounded-md bg-blue-50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-100 font-semibold" style={{ fontSize: "1rem" }}>
                      <TableHead className="w-8 px-1 py-2" />
                      <TableHead className="w-44 px-1 py-2">
                        <span>Nom&nbsp;/&nbsp;Prénom</span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell px-1 py-2 w-40">
                        <span>Email</span>
                      </TableHead>
                      <TableHead className="w-18 px-1 py-2">
                        <span>
                          <span title="Actif pour la session, ou désactivé (ne sera pas assigné)">
                            Actif
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="w-24 px-1 py-2">
                        <span>Type</span>
                      </TableHead>
                      <TableHead className="w-20 px-1 py-2">
                        <span>Statut</span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell w-28 px-1 py-2">
                        <span>
                          <span title="Faculté d’affectation (optionnel)">
                            Affect.
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="w-12 px-1 py-2">ETP</TableHead>
                      <TableHead className="w-20 px-1 py-2">
                        <span title="Assistant: ETP×6, PAT: ETP×12">{`Quota th.`}</span>
                      </TableHead>
                      <TableHead className="w-20 px-1 py-2">
                        <span>
                          <span title="Quota session (modifiable)">
                            Quota
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="w-28 px-1 py-2">
                        <span>
                          <span title="Blocages d'affectation (facultés interdites)">
                            Restrictions
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell w-24 px-1 py-2">
                        <span>Fin contrat</span>
                      </TableHead>
                      <TableHead className="w-16 px-1 py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  {/* Affichage du tableau */}
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={13}>Chargement...</TableCell>
                      </TableRow>
                    ) : currentRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center">Aucun surveillant actif</TableCell>
                      </TableRow>
                    ) : (
                      currentRows?.map((row) => {
                        const isEdit = editRow === row.id;
                        const isChecked = selectedRows.includes(row.id);
                        // Utilisation du champ TYPE pour quota
                        const type = row.type;
                        const statut = isEdit ? editValues.statut ?? row.statut : row.statut;
                        const etp = isEdit ? editValues.etp ?? row.eft ?? 0 : row.eft ?? 0;
                        const quotaTheorique = getTheoreticalQuota(type, etp);
                        const selectedFacs = isEdit
                          ? editValues.faculte_interdite ?? ["NONE"]
                          : row.faculte_interdite.length > 0
                          ? row.faculte_interdite
                          : ["NONE"];
                        return (
                          <TableRow key={row.id} className={isEdit ? "bg-blue-50" : undefined}>
                            <TableCell className="px-1 py-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                                aria-label="Sélectionner"
                                className="h-4 w-4"
                              />
                            </TableCell>
                            <TableCell className="px-1 py-1 font-medium">
                              <span>{row.nom} {row.prenom}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell px-1 py-1 text-xs">
                              {row.email}
                            </TableCell>
                            <TableCell className="px-1 py-1">
                              {row.session_entry_id && row.quota !== undefined ? (
                                isEdit ? (
                                  <span>
                                    {row.is_active ? "Actif" : "Désactivé"}
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={row.is_active ? "secondary" : "outline"}
                                    className={row.is_active ? "bg-emerald-100 text-emerald-700 h-7 px-2" : "bg-red-100 text-red-700 h-7 px-2"}
                                    onClick={() =>
                                      toggleActiveMutation.mutate({
                                        sessionEntryId: row.session_entry_id!,
                                        is_active: !row.is_active,
                                      })
                                    }
                                  >
                                    {row.is_active ? "Actif" : "Désactivé"}
                                  </Button>
                                )
                              ) : (
                                <span>-</span>
                              )}
                            </TableCell>
                            {/* --- TYPE --- */}
                            <TableCell className="px-1 py-1"><Badge variant="outline">{type}</Badge></TableCell>
                            {/* --- STATUT --- */}
                            <TableCell className="px-1 py-1">
                              {isEdit ? (
                                <select
                                  className="w-20 rounded-md border px-1 py-1 text-xs"
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
                                <Badge variant="outline">{statut}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell px-1 py-1 text-xs">
                              {isEdit ? (
                                <select
                                  className="w-16 rounded-md border px-1 py-1 text-xs"
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
                            <TableCell className="px-1 py-1">
                              {isEdit ? (
                                <Input
                                  type="number"
                                  className="w-12 h-7 text-xs"
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
                            <TableCell className="px-1 py-1">
                              <span className="inline-block px-1 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 min-w-[2rem] text-center">
                                {quotaTheorique}
                              </span>
                            </TableCell>
                            <TableCell className="px-1 py-1">
                              {isEdit ? (
                                <Input
                                  type="number"
                                  className="w-12 h-7 text-xs"
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
                            {/* Facultés interdites = Restrictions */}
                            <TableCell className="px-1 py-1">
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
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell px-1 py-1">
                              {row.date_fin_contrat ? new Date(row.date_fin_contrat).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell className="px-1 py-1">
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
            </TabsContent>
            {/* Table désactivés aussi adaptée : compact, quotas avec type */}
            <TabsContent value="desactives">
              <div className="overflow-x-auto border rounded-md bg-blue-50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-100 font-semibold" style={{ fontSize: "1rem" }}>
                      <TableHead className="w-8 px-1 py-2"></TableHead>
                      <TableHead className="w-44 px-1 py-2">Nom / Prénom</TableHead>
                      <TableHead className="hidden md:table-cell w-40 px-1 py-2">Email</TableHead>
                      <TableHead className="w-24 px-1 py-2">Type</TableHead>
                      <TableHead className="w-20 px-1 py-2">Statut</TableHead>
                      <TableHead className="w-12 px-1 py-2">ETP</TableHead>
                      <TableHead className="w-20 px-1 py-2" title="Quota théorique (Assistant: ETP×6, PAT: ETP×12)">Quota th.</TableHead>
                      <TableHead className="w-16 px-1 py-2">Quota</TableHead>
                      <TableHead className="hidden md:table-cell w-24 px-1 py-2">Fin contrat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9}>Chargement...</TableCell>
                      </TableRow>
                    ) : currentRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">Aucun surveillant désactivé</TableCell>
                      </TableRow>
                    ) : (
                      currentRows.map(row => {
                        const etp = row.eft ?? 0;
                        const quotaTheorique = getTheoreticalQuota(row.type, etp);
                        const isChecked = selectedRows.includes(row.id);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="px-1 py-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => handleSelectRow(row.id, e.target.checked)}
                                aria-label="Sélectionner"
                                className="h-4 w-4"
                              />
                            </TableCell>
                            <TableCell className="px-1 py-1 font-medium">{row.nom} {row.prenom}</TableCell>
                            <TableCell className="hidden md:table-cell px-1 py-1 text-xs">{row.email}</TableCell>
                            <TableCell className="px-1 py-1"><Badge variant="outline">{row.type}</Badge></TableCell>
                            <TableCell className="px-1 py-1"><Badge variant="outline">{row.statut}</Badge></TableCell>
                            <TableCell className="px-1 py-1">{etp}</TableCell>
                            <TableCell className="px-1 py-1">{quotaTheorique}</TableCell>
                            <TableCell className="px-1 py-1">{row.quota ?? "-"}</TableCell>
                            <TableCell className="hidden md:table-cell px-1 py-1">
                              {row.date_fin_contrat ? new Date(row.date_fin_contrat).toLocaleDateString() : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
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
