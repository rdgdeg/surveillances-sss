
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { useSurveillantSensitiveData } from "@/hooks/useSurveillantSensitiveData";
import { SensitiveDataManager } from "./SensitiveDataManager";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Save, X, Users, AlertTriangle, Calendar, MapPin } from "lucide-react";

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

export const SurveillantListEditor = () => {
  const [surveillants, setSurvaillants] = useState<SurveillantData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = (surveillant: SurveillantData) => {
    updateSurveillant(surveillant.id, surveillant);
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
        <Select value={editValue || ""} onValueChange={(val) => {
          setEditValue(val);
          onSave(val);
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

  const faculteOptions = [
    { value: "", label: "Aucune restriction" },
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
    { value: "", label: "Non renseigné" },
    { value: "FASB", label: "FASB" },
    { value: "EPL", label: "EPL" },
    { value: "FIAL", label: "FIAL" },
    { value: "PSSP", label: "PSSP" },
    { value: "ESPO", label: "ESPO" },
    { value: "FLTR", label: "FLTR" },
    { value: "TECO", label: "TECO" },
    { value: "FSM", label: "FSM (exclu)" }
  ];

  const campusOptions = [
    { value: "", label: "Non renseigné" },
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

  const excludedSurvaillants = surveillants.filter(s => 
    shouldExcludeFromAssignment({ 
      affectation_fac: s.affectation_fac, 
      date_fin_contrat: s.date_fin_contrat, 
      statut: 'actif' 
    }).exclude
  );

  const expiringSoon = surveillants.filter(s => 
    isContractExpiringSoon(s.date_fin_contrat)
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
            <span>Éditeur de Liste des Surveillants</span>
          </CardTitle>
          <CardDescription>
            Modifiez les informations, quotas et données sensibles des surveillants avant l'attribution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {surveillants.length} surveillant(s) dans la session active
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-600">
                  {surveillants.filter(s => s.is_active).length} Actifs
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {surveillants.filter(s => !s.is_active).length} Inactifs
                </Badge>
                {excludedSurvaillants.length > 0 && (
                  <Badge variant="destructive">
                    {excludedSurvaillants.length} Exclus
                  </Badge>
                )}
                {expiringSoon.length > 0 && (
                  <Badge variant="outline" className="text-orange-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {expiringSoon.length} Contrats exp.
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Faculté interdite</TableHead>
                    {showSensitiveData && (
                      <>
                        <TableHead>EFT</TableHead>
                        <TableHead>Affectation</TableHead>
                        <TableHead>Fin contrat</TableHead>
                        <TableHead>GSM</TableHead>
                        <TableHead>Campus</TableHead>
                      </>
                    )}
                    <TableHead>Quota</TableHead>
                    <TableHead>Sessions imposées</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveillants.map((surveillant) => {
                    const exclusionInfo = shouldExcludeFromAssignment({
                      affectation_fac: surveillant.affectation_fac,
                      date_fin_contrat: surveillant.date_fin_contrat,
                      statut: 'actif'
                    });
                    const contractExpiring = isContractExpiringSoon(surveillant.date_fin_contrat);

                    return (
                      <TableRow 
                        key={surveillant.id}
                        className={exclusionInfo.exclude ? 'bg-red-50' : contractExpiring ? 'bg-orange-50' : ''}
                      >
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
                                <AlertTriangle className="h-3 w-3 text-red-500" title={exclusionInfo.reason} />
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
                              value={surveillant.faculte_interdite || ""}
                              type="select"
                              options={faculteOptions}
                              onSave={(value) => setSurvaillants(prev => 
                                prev.map(s => s.id === surveillant.id ? { ...s, faculte_interdite: value || null } : s)
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
                                  value={surveillant.affectation_fac || ""}
                                  type="select"
                                  options={affectationOptions}
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, affectation_fac: value || null } : s)
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
                                  {contractExpiring && (
                                    <Calendar className="h-3 w-3 text-orange-500" title="Contrat expire bientôt" />
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
                                  value={surveillant.campus || ""}
                                  type="select"
                                  options={campusOptions}
                                  onSave={(value) => setSurvaillants(prev => 
                                    prev.map(s => s.id === surveillant.id ? { ...s, campus: value || null } : s)
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
