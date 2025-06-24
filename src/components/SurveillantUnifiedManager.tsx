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
import { Plus, X, RotateCcw, Edit, Save, Power, PowerOff, Search, Users, Target, Calculator } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CustomStatusModal } from "./CustomStatusModal";
import { FacultesMultiSelect, FACULTES_FILTERED } from "./FacultesMultiSelect";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SurveillantStatsRecap } from "./SurveillantStatsRecap";
import { NewFileUploader } from "./NewFileUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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

// Liste des facultés pour l'affectation
const FACULTES_AFFECTATION = [
  { value: "ASS", label: "ASS" },
  { value: "FASB", label: "FASB" },
  { value: "FSM", label: "FSM" },
  { value: "FSP", label: "FSP" },
  { value: "MEDE", label: "MEDE" },
  { value: "Autre", label: "Autre" }
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
  a_obligations?: boolean | null;
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

// Fonction pour calculer le quota théorique selon le type et ETP
const calculateTheoreticalQuota = (type: string, eft: number | null): number => {
  if (!eft || eft === 0) return 0;
  
  switch (type) {
    case 'PAT':
    case 'Doctorant':
      return 0; // PAT et Doctorant = 0
    case 'PAT FASB':
      return Math.round(eft * 12); // PAT FASB = 12 * ETP
    case 'Assistant':
      return Math.round(eft * 6); // Assistant = 6 * ETP
    default:
      return 6; // Valeur par défaut pour les autres types
  }
};

export function SurveillantUnifiedManager() {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    etp?: number;
    quota_theorique?: number;
    faculte_interdite?: string[];
    statut?: string;
    affectation_fac?: string;
    type?: string;
    a_obligations?: boolean;
  }>({});
  const [showUpload, setShowUpload] = useState(false);
  const [customStatuts, setCustomStatuts] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"actifs" | "desactives">("actifs");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // États pour l'ajout manuel
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSurveillant, setNewSurveillant] = useState<NewSurveillant>({
    nom: '',
    prenom: '',
    email: '',
    type: '',
    telephone: '',
    campus: 'Woluwe', // Valeur par défaut
    affectation_fac: '',
    eft: undefined,
    date_fin_contrat: '',
    quota: undefined
  });

  const statutsDisponibles = [...BASE_STATUTS, ...customStatuts, "Ajouter..."];

  // 1. CHARGEMENT surveillants (jointure surveillant_sessions)
  const { data: surveillants, isLoading } = useQuery({
    queryKey: ["unified-surveillants", activeSession?.id, searchTerm],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      let query = supabase
        .from("surveillant_sessions")
        .select(`
          id,
          surveillant_id,
          quota,
          is_active,
          a_obligations,
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
        `)
        .eq("session_id", activeSession.id);

      // Appliquer le filtre de recherche côté client après récupération
      const { data, error } = await query.order("surveillants(nom)", { ascending: true });

      if (error) throw error;

      let filteredData = (data ?? []).map((row: any) => ({
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
        eft: row.surveillants.eft ?? null,
        date_fin_contrat: row.surveillants.date_fin_contrat ?? null,
        session_entry_id: row.id,
        quota: row.quota ?? null,
        is_active: row.is_active === undefined ? true : row.is_active,
        a_obligations: row.a_obligations ?? true,
      })) as SurveillantJoinWithArray[];

      // Filtrage par terme de recherche
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item =>
          item.nom.toLowerCase().includes(term) ||
          item.prenom.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.type.toLowerCase().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!activeSession?.id,
  });

  // Mutation pour mettre à jour le quota de session
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
        title: "Quota modifié",
        description: "Le quota théorique a été mis à jour avec succès.",
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

  // Mutation pour activer/désactiver un surveillant
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
        title: "Statut modifié",
        description: "Le statut d'activation a été mis à jour.",
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

  // Mutation pour modifier les obligations
  const updateObligationsMutation = useMutation({
    mutationFn: async ({ sessionEntryId, a_obligations }: { sessionEntryId: string, a_obligations: boolean }) => {
      const { error } = await supabase
        .from("surveillant_sessions")
        .update({ a_obligations })
        .eq("id", sessionEntryId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Attribution auto modifiée",
        description: "Le statut d'attribution automatique a été mis à jour.",
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

  // Mutation pour recalculer automatiquement les quotas
  const recalculateQuotasMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id || !surveillants) return;
      
      const updates = surveillants.map(surveillant => {
        const theoreticalQuota = calculateTheoreticalQuota(surveillant.type, surveillant.eft);
        return {
          id: surveillant.session_entry_id!,
          quota: theoreticalQuota,
          a_obligations: theoreticalQuota > 0 // Auto-décocher si quota = 0
        };
      }).filter(update => update.id);

      for (const update of updates) {
        await supabase
          .from("surveillant_sessions")
          .update({ 
            quota: update.quota,
            a_obligations: update.a_obligations 
          })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Quotas recalculés",
        description: "Tous les quotas ont été recalculés selon les nouveaux critères.",
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

  const allRows = Array.isArray(surveillants) ? surveillants : [];
  const surveillantsActifs = allRows.filter(r => r.is_active);
  const surveillantsDesactives = allRows.filter(r => !r.is_active);
  const currentRows = activeTab === "actifs" ? surveillantsActifs : surveillantsDesactives;

  // Calculs pour les cartes récapitulatives
  const total = allRows.length;
  const actifs = surveillantsActifs.length;
  const inactifs = surveillantsDesactives.length;
  const typeMap = allRows.reduce((acc: Record<string, number>, r) => {
    acc[r.type || "Inconnu"] = (acc[r.type || "Inconnu"] || 0) + 1;
    return acc;
  }, {});
  
  const totalQuotaTheorique = allRows.reduce((sum, s) => {
    const quota = calculateTheoreticalQuota(s.type, s.eft);
    return sum + quota;
  }, 0);

  // Gestion de la sélection en masse
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const newSelected = currentRows.map(r => r.session_entry_id!).filter(Boolean);
      setSelectedRows(newSelected);
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (sessionEntryId: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, sessionEntryId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== sessionEntryId));
      setSelectAll(false);
    }
  };

  // Actions en masse
  const handleBulkActivation = async (activate: boolean) => {
    if (selectedRows.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un surveillant.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updates = selectedRows.map(sessionEntryId => 
        supabase
          .from("surveillant_sessions")
          .update({ is_active: activate })
          .eq("id", sessionEntryId)
      );

      await Promise.all(updates);
      
      queryClient.invalidateQueries();
      setSelectedRows([]);
      setSelectAll(false);
      
      toast({
        title: "Mise à jour réussie",
        description: `${selectedRows.length} surveillant(s) ${activate ? 'activé(s)' : 'désactivé(s)'}.`
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkObligations = async (aObligations: boolean) => {
    if (selectedRows.length === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un surveillant.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updates = selectedRows.map(sessionEntryId => 
        supabase
          .from("surveillant_sessions")
          .update({ a_obligations: aObligations })
          .eq("id", sessionEntryId)
      );

      await Promise.all(updates);
      
      queryClient.invalidateQueries();
      setSelectedRows([]);
      setSelectAll(false);
      
      toast({
        title: "Mise à jour réussie",
        description: `Attribution automatique ${aObligations ? 'activée' : 'désactivée'} pour ${selectedRows.length} surveillant(s).`
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (row: SurveillantJoinWithArray) => {
    const theoreticalQuota = calculateTheoreticalQuota(row.type, row.eft);
    setEditRow(row.id);
    setEditValues({
      etp: row.eft ?? 0,
      quota_theorique: theoreticalQuota,
      a_obligations: row.a_obligations ?? true,
    });
  };

  const handleSave = async (row: SurveillantJoinWithArray) => {
    if (editValues.quota_theorique !== undefined && row.session_entry_id) {
      await updateQuotaSessionMutation.mutateAsync({
        sessionEntryId: row.session_entry_id,
        quota: editValues.quota_theorique,
      });
    }
    
    if (editValues.a_obligations !== row.a_obligations && row.session_entry_id) {
      await updateObligationsMutation.mutateAsync({
        sessionEntryId: row.session_entry_id,
        a_obligations: editValues.a_obligations ?? true,
      });
    }
    
    setEditRow(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditRow(null);
    setEditValues({});
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des surveillants...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 px-0 md:px-8 max-w-screen-2xl w-full mx-auto">
      {/* Cartes récapitulatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total surveillants</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{total}</div>
            <div className="text-sm text-gray-500">
              {actifs} actifs • {inactifs} inactifs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Quota théorique total</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{totalQuotaTheorique}</div>
            <div className="text-sm text-gray-500">surveillances requises</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Calculator className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Par type</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(typeMap).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-600">{type}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Actifs avec quota &gt; 0</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {surveillantsActifs.filter(s => calculateTheoreticalQuota(s.type, s.eft) > 0).length}
            </div>
            <div className="text-sm text-gray-500">disponibles attribution</div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-none">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold text-uclouvain-blue mb-1">Gestion des surveillants</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Gérez les surveillants, quotas théoriques, activation/désactivation et attribution automatique.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => recalculateQuotasMutation.mutate()}
              disabled={recalculateQuotasMutation.isPending}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Recalculer quotas
            </Button>
            <Button variant="outline" onClick={() => setShowUpload(!showUpload)}>
              {showUpload ? 'Fermer' : 'Importer'} (Excel)
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {showUpload && (
            <div className="p-6 border-b">
              <NewFileUploader />
            </div>
          )}

          {/* Barre de recherche */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-2 max-w-md">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, prénom, email ou type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Actions en masse */}
          {selectedRows.length > 0 && (
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedRows.length} surveillant(s) sélectionné(s)
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkActivation(true)}
                  >
                    Activer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkActivation(false)}
                  >
                    Désactiver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkObligations(true)}
                  >
                    Inclure attribution
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkObligations(false)}
                  >
                    Exclure attribution
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedRows([]);
                      setSelectAll(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "actifs" | "desactives")}>
            <TabsList className="mb-3 ml-4">
              <TabsTrigger value="actifs">Actifs ({surveillantsActifs.length})</TabsTrigger>
              <TabsTrigger value="desactives">Désactivés ({surveillantsDesactives.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="actifs" className="p-0">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ETP</TableHead>
                      <TableHead>Quota théorique</TableHead>
                      <TableHead>Attribution auto</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.map((row) => {
                      const isEditing = editRow === row.id;
                      const theoreticalQuota = calculateTheoreticalQuota(row.type, row.eft);
                      const isSelected = selectedRows.includes(row.session_entry_id!);
                      
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleRowSelect(row.session_entry_id!, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{row.nom} {row.prenom}</div>
                              <div className="text-sm text-gray-500">{row.type}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{row.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.type}</Badge>
                          </TableCell>
                          <TableCell>{row.eft || '-'}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                value={editValues.quota_theorique || 0}
                                onChange={(e) => setEditValues(prev => ({
                                  ...prev,
                                  quota_theorique: parseInt(e.target.value) || 0
                                }))}
                                className="w-20"
                              />
                            ) : (
                              <span className="font-medium text-blue-600">{row.quota || theoreticalQuota}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Checkbox
                                checked={editValues.a_obligations ?? true}
                                onCheckedChange={(checked) => setEditValues(prev => ({
                                  ...prev,
                                  a_obligations: !!checked
                                }))}
                              />
                            ) : (
                              <Badge variant={row.a_obligations ? "default" : "secondary"}>
                                {row.a_obligations ? "Inclus" : "Exclu"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              {isEditing ? (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => handleSave(row)}
                                          disabled={updateQuotaSessionMutation.isPending}
                                        >
                                          <Save className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Sauvegarder</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancel}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEdit(row)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Modifier</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => row.session_entry_id && toggleActiveMutation.mutate({
                                            sessionEntryId: row.session_entry_id,
                                            is_active: false
                                          })}
                                          disabled={toggleActiveMutation.isPending}
                                        >
                                          <PowerOff className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Désactiver</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="desactives" className="p-0">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>ETP</TableHead>
                      <TableHead>Quota théorique</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.map((row) => {
                      const theoreticalQuota = calculateTheoreticalQuota(row.type, row.eft);
                      const isSelected = selectedRows.includes(row.session_entry_id!);
                      
                      return (
                        <TableRow key={row.id} className="opacity-60">
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleRowSelect(row.session_entry_id!, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{row.nom} {row.prenom}</div>
                              <div className="text-sm text-gray-500">{row.type}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{row.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.type}</Badge>
                          </TableCell>
                          <TableCell>{row.eft || '-'}</TableCell>
                          <TableCell>
                            <span className="font-medium text-blue-600">{row.quota || theoreticalQuota}</span>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => row.session_entry_id && toggleActiveMutation.mutate({
                                      sessionEntryId: row.session_entry_id,
                                      is_active: true
                                    })}
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    <Power className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Réactiver</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          {currentRows.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "Aucun surveillant trouvé correspondant à votre recherche." : "Aucun surveillant trouvé dans cette catégorie."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
