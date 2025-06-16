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
import { Plus, X, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomStatusModal } from "./CustomStatusModal";
import { FacultesMultiSelect, FACULTES_FILTERED } from "./FacultesMultiSelect";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SurveillantStatsRecap } from "./SurveillantStatsRecap";
import { SurveillantTable } from "./SurveillantTable";
import { NewFileUploader } from "./NewFileUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Liste FAUTES & AFFECTATIONS : inclus FSM + Autre
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
  faculte_interdite?: string;
  affectation_fac?: string;
  campus?: string;
  eft?: number;
  date_fin_contrat?: string | null;
  session_entry_id?: string;
  quota?: number | null;
  is_active?: boolean;
}

type SurveillantJoinWithArray = Omit<SurveillantJoin, "faculte_interdite"> & {
  faculte_interdite: string[];
  date_fin_contrat?: string | null;
  is_active: boolean;
};

interface NewSurveillant {
  nom: string;
  prenom: string;
  email: string;
  type: string;
  telephone?: string;
  campus?: string;
  affectation_fac?: string;
  eft?: number;
  date_fin_contrat?: string;
  quota?: number;
}

export function SurveillantUnifiedManager() {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<string | null>(null);
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
  
  // États pour l'ajout manuel
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSurveillant, setNewSurveillant] = useState<NewSurveillant>({
    nom: '',
    prenom: '',
    email: '',
    type: '',
    telephone: '',
    campus: '',
    affectation_fac: '',
    eft: undefined,
    date_fin_contrat: '',
    quota: undefined
  });

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
        faculte_interdite:
          row.surveillants.faculte_interdite && row.surveillants.faculte_interdite !== "NONE"
            ? row.surveillants.faculte_interdite.split(",").map((x: string) => x.trim())
            : [],
        affectation_fac: row.surveillants.affectation_fac,
        campus: row.surveillants.campus,
        eft: row.surveillants.eft ?? undefined,
        date_fin_contrat: row.surveillants.date_fin_contrat ?? null,
        session_entry_id: row.id,
        quota: row.quota ?? null,
        is_active: row.is_active === undefined ? true : row.is_active,
      })) as SurveillantJoinWithArray[];
    },
    enabled: !!activeSession?.id,
  });

  // Derived data - filter surveillants by active status
  const allRows = Array.isArray(surveillants) ? surveillants : [];
  const surveillantsActifs = allRows.filter(r => r.is_active);
  const surveillantsDesactives = allRows.filter(r => !r.is_active);
  const currentRows = activeTab === "actifs" ? surveillantsActifs : surveillantsDesactives;

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
      // Attention : Il faut requêter surveillant_sessions (liaison session/surveillant)
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

  // CORRIGE : Calcule le quota théorique correctement selon le statut
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
  const total = allRows.length;
  const actifs = allRows.filter(r => r.is_active).length;
  const inactifs = allRows.filter(r => !r.is_active).length;
  const typeMap = allRows.reduce((acc: Record<string, number>, r) => {
    acc[r.type || "Inconnu"] = (acc[r.type || "Inconnu"] || 0) + 1;
    return acc;
  }, {});

  // Mutation pour ajouter un surveillant manuellement
  const addSurveillantMutation = useMutation({
    mutationFn: async (surveillantData: NewSurveillant) => {
      if (!activeSession?.id) throw new Error("Session non sélectionnée");

      // Vérifier si l'email existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', surveillantData.email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        throw new Error(`Un surveillant avec l'email ${surveillantData.email} existe déjà.`);
      }

      // Créer le surveillant
      const { data: surveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .insert({
          nom: surveillantData.nom,
          prenom: surveillantData.prenom,
          email: surveillantData.email,
          type: surveillantData.type,
          telephone: surveillantData.telephone || null,
          campus: surveillantData.campus || null,
          affectation_fac: surveillantData.affectation_fac || null,
          eft: surveillantData.eft || null,
          date_fin_contrat: surveillantData.date_fin_contrat || null,
          statut: 'actif'
        })
        .select()
        .single();

      if (surveillantError) throw surveillantError;

      // Calculer le quota par défaut si non spécifié
      const defaultQuota = surveillantData.quota || (
        surveillantData.type === 'PAT FASB' ? 12 : 6
      );

      // L'associer à la session
      const { error: sessionError } = await supabase
        .from('surveillant_sessions')
        .insert({
          session_id: activeSession.id,
          surveillant_id: surveillant.id,
          is_active: true,
          quota: defaultQuota
        });

      if (sessionError) throw sessionError;

      return surveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-surveillants'] });
      setIsAddDialogOpen(false);
      setNewSurveillant({
        nom: '',
        prenom: '',
        email: '',
        type: '',
        telephone: '',
        campus: '',
        affectation_fac: '',
        eft: undefined,
        date_fin_contrat: '',
        quota: undefined
      });
      toast({
        title: "Surveillant ajouté",
        description: "Le surveillant a été ajouté avec succès à la session.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le surveillant.",
        variant: "destructive"
      });
    }
  });

  // Ajout manuel : gestion du formulaire
  const handleAddSurveillant = () => {
    if (!newSurveillant.nom || !newSurveillant.prenom || !newSurveillant.email || !newSurveillant.type) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    addSurveillantMutation.mutate(newSurveillant);
  };

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
              Gérez tous les surveillants, ETP, quotas, restrictions de facultés, et import/ajout sur la session courante.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un surveillant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouveau surveillant</DialogTitle>
                  <DialogDescription>
                    Ajoutez manuellement un nouveau surveillant à la session.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom *</label>
                      <Input
                        value={newSurveillant.nom}
                        onChange={(e) => setNewSurveillant(prev => ({ ...prev, nom: e.target.value }))}
                        placeholder="Nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Prénom *</label>
                      <Input
                        value={newSurveillant.prenom}
                        onChange={(e) => setNewSurveillant(prev => ({ ...prev, prenom: e.target.value }))}
                        placeholder="Prénom"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      value={newSurveillant.email}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <Select value={newSurveillant.type} onValueChange={(value) => setNewSurveillant(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personnel Académique">Personnel Académique</SelectItem>
                        <SelectItem value="Personnel Administratif">Personnel Administratif</SelectItem>
                        <SelectItem value="Jobiste">Jobiste</SelectItem>
                        <SelectItem value="PAT">PAT</SelectItem>
                        <SelectItem value="PAT FASB">PAT FASB</SelectItem>
                        <SelectItem value="Externe">Externe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ETP (Équivalent Temps Plein)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={newSurveillant.eft || ''}
                        onChange={(e) => setNewSurveillant(prev => ({ 
                          ...prev, 
                          eft: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                        placeholder="0.5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Valeur entre 0 et 1 (ex: 0.5 pour 50%)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Quota surveillances</label>
                      <Input
                        type="number"
                        min="0"
                        value={newSurveillant.quota || ''}
                        onChange={(e) => setNewSurveillant(prev => ({ 
                          ...prev, 
                          quota: e.target.value ? parseInt(e.target.value) : undefined 
                        }))}
                        placeholder="6"
                      />
                      <p className="text-xs text-gray-500 mt-1">Laissez vide pour valeur par défaut (6 ou 12 selon type)</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Date de fin de contrat</label>
                    <Input
                      type="date"
                      value={newSurveillant.date_fin_contrat || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, date_fin_contrat: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Laissez vide pour contrat permanent</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <Input
                      value={newSurveillant.telephone || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="Numéro de téléphone"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Campus</label>
                    <Input
                      value={newSurveillant.campus || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, campus: e.target.value }))}
                      placeholder="Campus"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Affectation Faculté</label>
                    <Input
                      value={newSurveillant.affectation_fac || ''}
                      onChange={(e) => setNewSurveillant(prev => ({ ...prev, affectation_fac: e.target.value }))}
                      placeholder="Faculté d'affectation"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleAddSurveillant} 
                      disabled={addSurveillantMutation.isPending}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={() => setShowUpload(!showUpload)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {showUpload ? 'Fermer' : 'Importer'} (Excel)
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Section Import */}
          {showUpload && (
            <div className="p-6 border-b">
              <NewFileUploader />
            </div>
          )}

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
