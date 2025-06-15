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
import { UploadCloud, Save, Plus, X, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomStatusModal } from "./CustomStatusModal";
import { FacultesMultiSelect, FACULTES_FILTERED } from "./FacultesMultiSelect";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SurveillantStatsRecap } from "./SurveillantStatsRecap";
import { SurveillantTable } from "./SurveillantTable";

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
    type?: string;
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
      type: row.type,
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
  const typeMap = allRows.reduce((acc: Record<string, number>, r) => {
    acc[r.type || "Inconnu"] = (acc[r.type || "Inconnu"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4 px-0 md:px-8 max-w-screen-2xl w-full mx-auto">
      {/* --- Recap --- */}
      <SurveillantStatsRecap
        total={total}
        actifs={actifs}
        inactifs={inactifs}
        typeMap={typeMap}
      />
      <Card className="w-full max-w-none">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-1">Liste des surveillants</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Gérez tous les surveillants, ETP, quotas, restrictions de facultés, et import sur la session courante.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleOpenUpload}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Importer surveillants (Excel)
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* --- Tabs, Table, Import, Modal, remain unchanged --- */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "actifs" | "desactives")}>
            <TabsList className="mb-3 ml-4">
              <TabsTrigger value="actifs">Actifs</TabsTrigger>
              <TabsTrigger value="desactives">Désactivés</TabsTrigger>
            </TabsList>
            <TabsContent value="actifs" className="p-0">
              <SurveillantTable
                rows={surveillantsActifs}
                editRow={editRow}
                editValues={editValues}
                isLoading={isLoading}
                selectedRows={selectedRows}
                onEdit={handleEdit}
                onEditChange={vals => setEditValues(vals)}
                onSave={handleSave}
                onCancel={handleCancel}
                onSelectRow={handleSelectRow}
                onToggleActive={(id, statut) => toggleActiveMutation.mutate({ sessionEntryId: id, is_active: statut })}
                statutsDisponibles={statutsDisponibles}
                modalOpen={modalOpen}
                setModalOpen={setModalOpen}
                hasSessionEntryId={true}
                compact={true}
              />
            </TabsContent>
            <TabsContent value="desactives" className="p-0">
              <SurveillantTable
                rows={surveillantsDesactives}
                editRow={editRow}
                editValues={editValues}
                isLoading={isLoading}
                selectedRows={selectedRows}
                onEdit={handleEdit}
                onEditChange={vals => setEditValues(vals)}
                onSave={handleSave}
                onCancel={handleCancel}
                onSelectRow={handleSelectRow}
                onToggleActive={(id, statut) => toggleActiveMutation.mutate({ sessionEntryId: id, is_active: statut })}
                statutsDisponibles={statutsDisponibles}
                modalOpen={modalOpen}
                setModalOpen={setModalOpen}
                hasSessionEntryId={true}
                compact={true}
              />
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
