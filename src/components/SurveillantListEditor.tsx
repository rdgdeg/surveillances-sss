import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { useSurveillantSensitiveData } from "@/hooks/useSurveillantSensitiveData";
import { SensitiveDataManager } from "./SensitiveDataManager";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Save, X, Users, AlertTriangle, Calendar, MapPin, Search, Filter, SortAsc, SortDesc, CheckSquare, Square } from "lucide-react";

interface SurveillantData {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  faculte_interdite: string | null;
  quota: number;
  is_active: boolean;
  sessions_imposees: number;
  // Nouvelles colonnes sensibles
  eft: number | null;
  affectation_fac: string | null;
  date_fin_contrat: string | null;
  telephone_gsm: string | null;
  campus: string | null;
}

type SortField = 'nom' | 'prenom' | 'email' | 'type' | 'quota' | 'date_fin_contrat';
type SortDirection = 'asc' | 'desc';

export const SurveillantListEditor = () => {
  const [surveillants, setSurvaillants] = useState<SurveillantData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("actifs");
  
  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [faculteFilter, setFaculteFilter] = useState<string>("all");
  const [affectationFilter, setAffectationFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Sélection en masse
  const [selectedSurvaillants, setSelectedSurvaillants] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const { data: activeSession } = useActiveSession();
  const {
    showSensitiveData,
    setShowSensitiveData,
    shouldExcludeFromAssignment,
    isContractExpiringSoon,
    calculateAdjustedQuota,
    formatSensitiveDisplay
  } = useSurveillantSensitiveData();

  useEffect(() => {
    if (activeSession) {
      loadSurvaillants();
    }
  }, [activeSession]);

  const loadSurvaillants = async () => {
    if (!activeSession) return;

    try {
      const { data, error } = await supabase
        .from('surveillants')
        .select(`
          id, nom, prenom, email, type, faculte_interdite,
          eft, affectation_fac, date_fin_contrat, telephone_gsm, campus,
          surveillant_sessions!inner(quota, is_active, sessions_imposees)
        `)
        .eq('surveillant_sessions.session_id', activeSession.id)
        .eq('statut', 'actif')
        .order('nom');

      if (error) throw error;

      const formattedData = data?.map(s => ({
        id: s.id,
        nom: s.nom,
        prenom: s.prenom,
        email: s.email,
        type: s.type,
        faculte_interdite: s.faculte_interdite,
        eft: s.eft,
        affectation_fac: s.affectation_fac,
        date_fin_contrat: s.date_fin_contrat,
        telephone_gsm: s.telephone_gsm,
        campus: s.campus,
        quota: s.surveillant_sessions[0]?.quota || 6,
        is_active: s.surveillant_sessions[0]?.is_active || false,
        sessions_imposees: s.surveillant_sessions[0]?.sessions_imposees || 0
      })) || [];

      setSurvaillants(formattedData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les surveillants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour déterminer si un contrat est expiré
  const isContractExpired = (dateFinContrat: string | null): boolean => {
    if (!dateFinContrat) return false;
    const today = new Date();
    const contractEnd = new Date(dateFinContrat);
    return contractEnd < today;
  };

  // Filtrage et tri des surveillants
  const filteredAndSortedSurvaillants = useMemo(() => {
    let filtered = surveillants.filter(s => {
      // Filtre par onglet actif
      if (activeTab === "actifs" && !s.is_active) return false;
      if (activeTab === "inactifs" && s.is_active) return false;
      if (activeTab === "expires") {
        const contractExpired = isContractExpired(s.date_fin_contrat);
        const contractExpiring = isContractExpiringSoon(s.date_fin_contrat);
        if (!contractExpired && !contractExpiring) return false;
      }

      // Filtre par terme de recherche
      if (searchTerm && !`${s.nom} ${s.prenom} ${s.email}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtre par type
      if (typeFilter !== "all" && s.type !== typeFilter) return false;

      // Filtre par faculté interdite
      if (faculteFilter !== "all" && s.faculte_interdite !== faculteFilter) return false;

      // Filtre par affectation (corrigé)
      if (affectationFilter !== "all") {
        if (affectationFilter === "none" && s.affectation_fac !== null) return false;
        if (affectationFilter !== "none" && s.affectation_fac !== affectationFilter) return false;
      }

      return true;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'date_fin_contrat') {
        aValue = aValue ? new Date(aValue as string).getTime() : 0;
        bValue = bValue ? new Date(bValue as string).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [surveillants, activeTab, searchTerm, typeFilter, faculteFilter, affectationFilter, sortField, sortDirection]);

  // Gestion de la sélection en masse
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const newSelected = new Set(filteredAndSortedSurvaillants.map(s => s.id));
      setSelectedSurvaillants(newSelected);
    } else {
      setSelectedSurvaillants(new Set());
    }
  };

  const handleSelectSurveillant = (surveillantId: string, checked: boolean) => {
    const newSelected = new Set(selectedSurvaillants);
    if (checked) {
      newSelected.add(surveillantId);
    } else {
      newSelected.delete(surveillantId);
      setSelectAll(false);
    }
    setSelectedSurvaillants(newSelected);
  };

  // Actions en masse
  const handleBulkActivation = async (activate: boolean) => {
    if (selectedSurvaillants.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins un surveillant.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const updates = Array.from(selectedSurvaillants).map(surveillantId => 
        supabase
          .from('surveillant_sessions')
          .update({ is_active: activate })
          .eq('surveillant_id', surveillantId)
          .eq('session_id', activeSession!.id)
      );

      await Promise.all(updates);

      // Mettre à jour l'état local
      setSurvaillants(prev => prev.map(s => 
        selectedSurvaillants.has(s.id) ? { ...s, is_active: activate } : s
      ));

      setSelectedSurvaillants(new Set());
      setSelectAll(false);

      toast({
        title: "Mise à jour réussie",
        description: `${selectedSurvaillants.size} surveillant(s) ${activate ? 'activé(s)' : 'désactivé(s)'}.`
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les surveillants",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Statistiques pour les badges
  const stats = useMemo(() => {
    const actifs = surveillants.filter(s => s.is_active);
    const inactifs = surveillants.filter(s => !s.is_active);
    const expires = surveillants.filter(s => 
      isContractExpired(s.date_fin_contrat) || isContractExpiringSoon(s.date_fin_contrat)
    );
    const exclus = surveillants.filter(s => 
      shouldExcludeFromAssignment({ 
        affectation_fac: s.affectation_fac, 
        date_fin_contrat: s.date_fin_contrat, 
        statut: 'actif' 
      }).exclude
    );

    return { actifs, inactifs, expires, exclus };
  }, [surveillants, shouldExcludeFromAssignment]);

  const updateSurveillant = async (id: string, updatedData: Partial<SurveillantData>) => {
    setSaving(true);
    
    try {
      // Mettre à jour les données de base du surveillant
      const surveillantUpdates: any = {};
      if (updatedData.nom !== undefined) surveillantUpdates.nom = updatedData.nom;
      if (updatedData.prenom !== undefined) surveillantUpdates.prenom = updatedData.prenom;
      if (updatedData.email !== undefined) surveillantUpdates.email = updatedData.email;
      if (updatedData.type !== undefined) surveillantUpdates.type = updatedData.type;
      if (updatedData.faculte_interdite !== undefined) surveillantUpdates.faculte_interdite = updatedData.faculte_interdite;
      if (updatedData.eft !== undefined) surveillantUpdates.eft = updatedData.eft;
      if (updatedData.affectation_fac !== undefined) surveillantUpdates.affectation_fac = updatedData.affectation_fac;
      if (updatedData.date_fin_contrat !== undefined) surveillantUpdates.date_fin_contrat = updatedData.date_fin_contrat;
      if (updatedData.telephone_gsm !== undefined) surveillantUpdates.telephone_gsm = updatedData.telephone_gsm;
      if (updatedData.campus !== undefined) surveillantUpdates.campus = updatedData.campus;

      if (Object.keys(surveillantUpdates).length > 0) {
        const { error: surveillantError } = await supabase
          .from('surveillants')
          .update(surveillantUpdates)
          .eq('id', id);

        if (surveillantError) throw surveillantError;
      }

      // Mettre à jour les données de session
      const sessionUpdates: any = {};
      if (updatedData.quota !== undefined) sessionUpdates.quota = updatedData.quota;
      if (updatedData.is_active !== undefined) sessionUpdates.is_active = updatedData.is_active;
      if (updatedData.sessions_imposees !== undefined) sessionUpdates.sessions_imposees = updatedData.sessions_imposees;

      if (Object.keys(sessionUpdates).length > 0) {
        const { error: sessionError } = await supabase
          .from('surveillant_sessions')
          .update(sessionUpdates)
          .eq('surveillant_id', id)
          .eq('session_id', activeSession!.id);

        if (sessionError) throw sessionError;
      }

      // Mettre à jour l'état local
      setSurvaillants(prev => prev.map(s => 
        s.id === id ? { ...s, ...updatedData } : s
      ));

      setEditingId(null);
      
      toast({
        title: "Surveillant mis à jour",
        description: "Les modifications ont été sauvegardées avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le surveillant",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const EditableCell = ({ 
    value, 
    onSave, 
    type = "text",
    options = undefined 
  }: { 
    value: any, 
    onSave: (value: any) => void, 
    type?: "text" | "number" | "date" | "select" | "switch",
    options?: { value: string, label: string }[]
  }) => {
    const [editValue, setEditValue] = useState(value);

    const handleSaveClick = () => {
      onSave(editValue);
    };

    if (type === "switch") {
      return (
        <Switch
          checked={editValue}
          onCheckedChange={(checked) => {
            setEditValue(checked);
            onSave(checked);
          }}
        />
      );
    }

    if (type === "select" && options) {
      return (
        <Select value={editValue || "none"} onValueChange={(val) => {
          const finalValue = val === "none" ? null : val;
          setEditValue(finalValue);
          onSave(finalValue);
        }}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
          className="min-w-[120px]"
        />
        <Button size="sm" onClick={handleSaveClick}>
          <Save className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Fixed option arrays - no empty strings, use "none" as placeholder
  const faculteOptions = [
    { value: "none", label: "Aucune restriction" },
    { value: "FASB", label: "FASB" },
    { value: "EPL", label: "EPL" },
    { value: "FIAL", label: "FIAL" },
    { value: "PSSP", label: "PSSP" },
    { value: "ESPO", label: "ESPO" },
    { value: "FLTR", label: "FLTR" },
    { value: "TECO", label: "TECO" }
  ];

  const typeOptions = [
    { value: "PAT", label: "PAT" },
    { value: "PAT FASB", label: "PAT FASB" },
    { value: "Assistant", label: "Assistant" },
    { value: "Doctorant", label: "Doctorant" },
    { value: "Jobiste", label: "Jobiste" },
    { value: "Autre", label: "Autre" }
  ];

  const affectationOptions = [
    { value: "none", label: "Non renseigné" },
    { value: "FASB", label: "FASB" },
    { value: "EPL", label: "EPL" },
    { value: "FIAL", label: "FIAL" },
    { value: "PSSP", label: "PSSP" },
    { value: "ESPO", label: "ESPO" },
    { value: "FLTR", label: "FLTR" },
    { value: "TECO", label: "TECO" },
    { value: "FSM", label: "FSM (exclu)" },
    { value: "MEDE", label: "MEDE" },
    { value: "ASS", label: "ASS" }
  ];

  const campusOptions = [
    { value: "none", label: "Non renseigné" },
    { value: "Louvain-la-Neuve", label: "Louvain-la-Neuve" },
    { value: "Woluwe", label: "Woluwe" },
    { value: "Mons", label: "Mons" },
    { value: "Tournai", label: "Tournai" },
    { value: "Charleroi", label: "Charleroi" }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Chargement des surveillants...</div>
        </CardContent>
      </Card>
    );
  }

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </div>
        </CardContent>
      </Card>
    );
  }

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50" 
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <SensitiveDataManager 
        showSensitiveData={showSensitiveData}
        onToggle={setShowSensitiveData}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Gestion des Surveillants</span>
          </CardTitle>
          <CardDescription>
            Gérez les surveillants par catégorie avec filtres et options de recherche avancées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtres et recherche */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={faculteFilter} onValueChange={setFaculteFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Faculté interdite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes facultés</SelectItem>
                  <SelectItem value="none">Aucune restriction</SelectItem>
                  {faculteOptions.slice(1).map((faculte) => (
                    <SelectItem key={faculte.value} value={faculte.value}>
                      {faculte.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={affectationFilter} onValueChange={setAffectationFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Affectation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes affectations</SelectItem>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  {affectationOptions.slice(1).map((affectation) => (
                    <SelectItem key={affectation.value} value={affectation.value}>
                      {affectation.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions de sélection en masse */}
            {selectedSurvaillants.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800">
                    {selectedSurvaillants.size} surveillant(s) sélectionné(s)
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkActivation(true)}
                    disabled={saving}
                  >
                    Activer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkActivation(false)}
                    disabled={saving}
                  >
                    Désactiver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSurvaillants(new Set());
                      setSelectAll(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Onglets avec statistiques */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="actifs" className="flex items-center space-x-2">
                  <span>Actifs</span>
                  <Badge variant="outline" className="text-green-600">
                    {stats.actifs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="inactifs" className="flex items-center space-x-2">
                  <span>Inactifs</span>
                  <Badge variant="outline" className="text-gray-600">
                    {stats.inactifs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="expires" className="flex items-center space-x-2">
                  <span>Contrats expirés/expirant</span>
                  <Badge variant="outline" className="text-orange-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {stats.expires.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="actifs" className="mt-4">
                <div className="text-sm text-gray-600 mb-2">
                  {filteredAndSortedSurvaillants.length} surveillant(s) actif(s) affiché(s)
                </div>
              </TabsContent>

              <TabsContent value="inactifs" className="mt-4">
                <div className="text-sm text-gray-600 mb-2">
                  {filteredAndSortedSurvaillants.length} surveillant(s) inactif(s) affiché(s)
                </div>
              </TabsContent>

              <TabsContent value="expires" className="mt-4">
                <div className="text-sm text-orange-600 mb-2">
                  {filteredAndSortedSurvaillants.length} surveillant(s) avec contrat expiré ou expirant prochainement
                </div>
              </TabsContent>
            </Tabs>

            {/* Informations additionnelles */}
            {stats.exclus.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">
                  {stats.exclus.length} Exclus de l'attribution
                </Badge>
                <span className="text-sm text-gray-500">
                  (affectation FSM ou contrat expiré)
                </span>
              </div>
            )}

            {/* Tableau des surveillants */}
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <SortableHeader field="nom">Nom</SortableHeader>
                    <SortableHeader field="prenom">Prénom</SortableHeader>
                    <SortableHeader field="email">Email</SortableHeader>
                    <SortableHeader field="type">Type</SortableHeader>
                    <TableHead>Faculté interdite</TableHead>
                    {showSensitiveData && (
                      <>
                        <TableHead>EFT</TableHead>
                        <TableHead>Affectation</TableHead>
                        <SortableHeader field="date_fin_contrat">Fin contrat</SortableHeader>
                        <TableHead>GSM</TableHead>
                        <TableHead>Campus</TableHead>
                      </>
                    )}
                    <SortableHeader field="quota">Quota</SortableHeader>
                    <TableHead>Sessions imposées</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSurvaillants.map((surveillant) => {
                    const exclusionInfo = shouldExcludeFromAssignment({
                      affectation_fac: surveillant.affectation_fac,
                      date_fin_contrat: surveillant.date_fin_contrat,
                      statut: 'actif'
                    });
                    const contractExpiring = isContractExpiringSoon(surveillant.date_fin_contrat);
                    const contractExpired = isContractExpired(surveillant.date_fin_contrat);

                    return (
                      <TableRow 
                        key={surveillant.id}
                        className={
                          exclusionInfo.exclude ? 'bg-red-50' : 
                          contractExpired ? 'bg-red-100' :
                          contractExpiring ? 'bg-orange-50' : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedSurvaillants.has(surveillant.id)}
                            onCheckedChange={(checked) => 
                              handleSelectSurveillant(surveillant.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.nom}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, nom: value } : s)
                              )}
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{surveillant.nom}</span>
                              {exclusionInfo.exclude && (
                                <div title={exclusionInfo.reason}>
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                </div>
                              )}
                              {contractExpired && (
                                <div title="Contrat expiré">
                                  <AlertTriangle className="h-3 w-3 text-red-600" />
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.prenom}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, prenom: value } : s)
                              )}
                            />
                          ) : (
                            surveillant.prenom
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.email}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, email: value } : s)
                              )}
                            />
                          ) : (
                            surveillant.email
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.type}
                              type="select"
                              options={typeOptions}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, type: value } : s)
                              )}
                            />
                          ) : (
                            <Badge variant="outline">{surveillant.type}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.faculte_interdite || "none"}
                              type="select"
                              options={faculteOptions}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, faculte_interdite: value === "none" ? null : value } : s)
                              )}
                            />
                          ) : (
                            surveillant.faculte_interdite ? (
                              <Badge variant="destructive">{surveillant.faculte_interdite}</Badge>
                            ) : (
                              <span className="text-gray-400">Aucune</span>
                            )
                          )}
                        </TableCell>
                        
                        {/* Colonnes sensibles */}
                        {showSensitiveData && (
                          <>
                            <TableCell>
                              {editingId === surveillant.id ? (
                                <EditableCell
                                  value={surveillant.eft || ""}
                                  type="number"
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, eft: value || null } : s)
                                  )}
                                />
                              ) : (
                                <span className="text-sm">
                                  {formatSensitiveDisplay(surveillant.eft, 'eft')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === surveillant.id ? (
                                <EditableCell
                                  value={surveillant.affectation_fac || "none"}
                                  type="select"
                                  options={affectationOptions}
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, affectation_fac: value === "none" ? null : value } : s)
                                  )}
                                />
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">
                                    {formatSensitiveDisplay(surveillant.affectation_fac, 'text')}
                                  </span>
                                  {surveillant.affectation_fac === 'FSM' && (
                                    <Badge variant="destructive" className="text-xs">Exclu</Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === surveillant.id ? (
                                <EditableCell
                                  value={surveillant.date_fin_contrat || ""}
                                  type="date"
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, date_fin_contrat: value || null } : s)
                                  )}
                                />
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">
                                    {formatSensitiveDisplay(surveillant.date_fin_contrat, 'date')}
                                  </span>
                                  {contractExpired && (
                                    <div title="Contrat expiré">
                                      <AlertTriangle className="h-3 w-3 text-red-600" />
                                    </div>
                                  )}
                                  {contractExpiring && !contractExpired && (
                                    <div title="Contrat expire bientôt">
                                      <Calendar className="h-3 w-3 text-orange-500" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === surveillant.id ? (
                                <EditableCell
                                  value={surveillant.telephone_gsm || ""}
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, telephone_gsm: value || null } : s)
                                  )}
                                />
                              ) : (
                                <span className="text-sm">
                                  {formatSensitiveDisplay(surveillant.telephone_gsm, 'text')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === surveillant.id ? (
                                <EditableCell
                                  value={surveillant.campus || "none"}
                                  type="select"
                                  options={campusOptions}
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, campus: value === "none" ? null : value } : s)
                                  )}
                                />
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">
                                    {formatSensitiveDisplay(surveillant.campus, 'text')}
                                  </span>
                                  {surveillant.campus && (
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </>
                        )}

                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.quota}
                              type="number"
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, quota: value } : s)
                              )}
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span>{surveillant.quota}</span>
                              {surveillant.eft && showSensitiveData && (
                                <span className="text-xs text-gray-500">
                                  (ajusté: {calculateAdjustedQuota(surveillant.quota, surveillant.eft)})
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === surveillant.id ? (
                            <EditableCell
                              value={surveillant.sessions_imposees}
                              type="number"
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, sessions_imposees: value } : s)
                              )}
                            />
                          ) : (
                            surveillant.sessions_imposees
                          )}
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            value={surveillant.is_active}
                            type="switch"
                            onSave={(value) => setSurvaillants(prev => 
                              prev.map(s => s.id === surveillant.id ? { ...s, is_active: value } : s)
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {editingId === surveillant.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateSurveillant(surveillant.id, surveillant)}
                                  disabled={saving}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(surveillant.id)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredAndSortedSurvaillants.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun surveillant trouvé avec les filtres actuels.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
