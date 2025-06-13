
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Users, Save, Eye, Building2, Search, Check, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateBelgian } from "@/lib/dateUtils";

interface ExamenReview {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  nombre_surveillants: number;
  surveillants_enseignant: number;
  surveillants_amenes: number;
  surveillants_pre_assignes: number;
  surveillants_a_attribuer: number;
  type_requis: string;
  statut_validation: string;
}

interface ContrainteAuditoire {
  auditoire: string;
  nombre_surveillants_requis: number;
}

interface ExamenGroupe {
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  auditoire_unifie: string;
  examens: ExamenReview[];
  nombre_surveillants_total: number;
  surveillants_enseignant_total: number;
  surveillants_amenes_total: number;
  surveillants_pre_assignes_total: number;
  surveillants_a_attribuer_total: number;
}

// Fonction pour unifier les noms d'auditoires similaires
const unifierAuditoire = (salle: string): string => {
  // Nettoyer et normaliser le nom de salle
  const salleNormalisee = salle.trim();
  
  // Cas spécifique pour Neerveld A, B, C, etc.
  if (salleNormalisee.match(/^Neerveld\s+[A-Z]$/i)) {
    return "Neerveld";
  }
  
  // Autres cas similaires peuvent être ajoutés ici
  // Ex: "Salle 1A", "Salle 1B" → "Salle 1"
  const match = salleNormalisee.match(/^(.+?)\s+[A-Z]$/);
  if (match) {
    return match[1];
  }
  
  return salleNormalisee;
};

// Fonction pour calculer la contrainte unifiée
const getContrainteUnifiee = (auditoire: string, contraintesOriginales: ContrainteAuditoire[]): number => {
  if (auditoire === "Neerveld") {
    // Compter toutes les contraintes Neerveld A, B, C, etc.
    const contraintesNeerveld = contraintesOriginales.filter(c => 
      c.auditoire.match(/^Neerveld\s+[A-Z]$/i)
    );
    return contraintesNeerveld.reduce((sum, c) => sum + c.nombre_surveillants_requis, 0) || 1;
  }
  
  // Pour d'autres auditoires, chercher la contrainte directe ou calculer
  const contrainteDirecte = contraintesOriginales.find(c => c.auditoire === auditoire);
  if (contrainteDirecte) {
    return contrainteDirecte.nombre_surveillants_requis;
  }
  
  // Chercher des contraintes similaires (ex: "Salle 1A", "Salle 1B" pour "Salle 1")
  const contraintesSimilaires = contraintesOriginales.filter(c => 
    c.auditoire.startsWith(auditoire + " ")
  );
  
  return contraintesSimilaires.reduce((sum, c) => sum + c.nombre_surveillants_requis, 0) || 1;
};

export const ExamenReviewManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editingExamens, setEditingExamens] = useState<Record<string, Partial<ExamenGroupe>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedGroupes, setSelectedGroupes] = useState<Set<string>>(new Set());

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenReview[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'NON_TRAITE')
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true })
        .order('code_examen', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async (): Promise<ContrainteAuditoire[]> => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (error) throw error;
      return data || [];
    }
  });

  // Grouper et fusionner les examens par code/date/heure + auditoire unifié
  const examensGroupes: ExamenGroupe[] = useMemo(() => {
    if (!examens || !contraintesAuditoires) return [];

    const groupes = new Map<string, ExamenGroupe>();

    examens.forEach(examen => {
      const auditoire_unifie = unifierAuditoire(examen.salle);
      const cle = `${examen.code_examen}-${examen.date_examen}-${examen.heure_debut}-${auditoire_unifie}`;
      
      if (groupes.has(cle)) {
        // Ajouter à un groupe existant
        const groupe = groupes.get(cle)!;
        groupe.examens.push(examen);
        groupe.nombre_surveillants_total += examen.nombre_surveillants;
        groupe.surveillants_enseignant_total += examen.surveillants_enseignant || 0;
        groupe.surveillants_amenes_total += examen.surveillants_amenes || 0;
        groupe.surveillants_pre_assignes_total += examen.surveillants_pre_assignes || 0;
        groupe.surveillants_a_attribuer_total += examen.surveillants_a_attribuer || 0;
      } else {
        // Créer un nouveau groupe
        const contrainteUnifiee = getContrainteUnifiee(auditoire_unifie, contraintesAuditoires);
        
        groupes.set(cle, {
          code_examen: examen.code_examen,
          matiere: examen.matiere,
          date_examen: examen.date_examen,
          heure_debut: examen.heure_debut,
          heure_fin: examen.heure_fin,
          auditoire_unifie,
          examens: [examen],
          nombre_surveillants_total: contrainteUnifiee, // Utiliser la contrainte par défaut
          surveillants_enseignant_total: examen.surveillants_enseignant || 0,
          surveillants_amenes_total: examen.surveillants_amenes || 0,
          surveillants_pre_assignes_total: examen.surveillants_pre_assignes || 0,
          surveillants_a_attribuer_total: Math.max(0, contrainteUnifiee - 
            (examen.surveillants_enseignant || 0) - 
            (examen.surveillants_amenes || 0) - 
            (examen.surveillants_pre_assignes || 0))
        });
      }
    });

    return Array.from(groupes.values()).sort((a, b) => {
      // Tri par date, puis heure, puis code d'examen
      if (a.date_examen !== b.date_examen) {
        return a.date_examen.localeCompare(b.date_examen);
      }
      if (a.heure_debut !== b.heure_debut) {
        return a.heure_debut.localeCompare(b.heure_debut);
      }
      return a.code_examen.localeCompare(b.code_examen);
    });
  }, [examens, contraintesAuditoires]);

  // Suggestions pour l'autocomplétion
  const allSearchTerms = useMemo(() => {
    if (!examensGroupes) return [];
    
    const terms = new Set<string>();
    examensGroupes.forEach(groupe => {
      terms.add(groupe.code_examen.toLowerCase());
      terms.add(groupe.matiere.toLowerCase());
      terms.add(groupe.auditoire_unifie.toLowerCase());
    });
    
    return Array.from(terms);
  }, [examensGroupes]);

  // Mise à jour des suggestions de recherche
  const updateSearchSuggestions = (value: string) => {
    if (value.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allSearchTerms
      .filter(term => term.includes(value.toLowerCase()))
      .slice(0, 5);
    
    setSearchSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateSearchSuggestions(value);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const updateExamenMutation = useMutation({
    mutationFn: async ({ groupe, updates }: { groupe: ExamenGroupe; updates: Partial<ExamenGroupe> }) => {
      // Mettre à jour tous les examens du groupe
      for (const examen of groupe.examens) {
        const examenUpdates: any = {};
        
        if (updates.nombre_surveillants_total !== undefined) {
          // Répartir le total sur tous les examens du groupe
          examenUpdates.nombre_surveillants = Math.ceil(updates.nombre_surveillants_total / groupe.examens.length);
        }
        
        if (updates.surveillants_enseignant_total !== undefined) {
          examenUpdates.surveillants_enseignant = Math.ceil(updates.surveillants_enseignant_total / groupe.examens.length);
        }
        
        if (updates.surveillants_amenes_total !== undefined) {
          examenUpdates.surveillants_amenes = Math.ceil(updates.surveillants_amenes_total / groupe.examens.length);
        }
        
        if (updates.surveillants_pre_assignes_total !== undefined) {
          examenUpdates.surveillants_pre_assignes = Math.ceil(updates.surveillants_pre_assignes_total / groupe.examens.length);
        }

        if (Object.keys(examenUpdates).length > 0) {
          const { error } = await supabase
            .from('examens')
            .update(examenUpdates)
            .eq('id', examen.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      setEditingExamens({});
      toast({
        title: "Examens mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour les examens.",
        variant: "destructive"
      });
    }
  });

  const validateExamensMutation = useMutation({
    mutationFn: async (groupes: ExamenGroupe[]) => {
      const examensToValidate = groupes.flatMap(groupe => groupe.examens);
      
      for (const examen of examensToValidate) {
        const { error } = await supabase
          .from('examens')
          .update({ statut_validation: 'VALIDE' })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, groupes) => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      setSelectedGroupes(new Set());
      toast({
        title: "Examens validés",
        description: `${groupes.length} groupe(s) d'examens ont été validés avec succès.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider les examens.",
        variant: "destructive"
      });
    }
  });

  const applquerContraintesAuditoiresMutation = useMutation({
    mutationFn: async () => {
      if (!examens || !contraintesAuditoires) return;

      for (const examen of examens) {
        const auditoire_unifie = unifierAuditoire(examen.salle);
        const contrainteUnifiee = getContrainteUnifiee(auditoire_unifie, contraintesAuditoires);
        
        const { error } = await supabase
          .from('examens')
          .update({ nombre_surveillants: contrainteUnifiee })
          .eq('id', examen.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      toast({
        title: "Contraintes appliquées",
        description: "Les contraintes d'auditoires ont été appliquées à tous les examens.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer les contraintes.",
        variant: "destructive"
      });
    }
  });

  const handleFieldChange = (groupeKey: string, field: string, value: string | number) => {
    setEditingExamens(prev => ({
      ...prev,
      [groupeKey]: {
        ...prev[groupeKey],
        [field]: value
      }
    }));
  };

  const handleSaveGroupe = (groupe: ExamenGroupe) => {
    const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
    const updates = editingExamens[groupeKey];
    if (!updates || Object.keys(updates).length === 0) return;

    updateExamenMutation.mutate({
      groupe,
      updates
    });
  };

  const handleValidateGroupe = (groupe: ExamenGroupe) => {
    validateExamensMutation.mutate([groupe]);
  };

  const handleValidateSelected = () => {
    const groupesToValidate = filteredExamens.filter(groupe => {
      const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
      return selectedGroupes.has(groupeKey);
    });
    
    if (groupesToValidate.length > 0) {
      validateExamensMutation.mutate(groupesToValidate);
    }
  };

  const handleSelectGroupe = (groupeKey: string, selected: boolean) => {
    const newSelected = new Set(selectedGroupes);
    if (selected) {
      newSelected.add(groupeKey);
    } else {
      newSelected.delete(groupeKey);
    }
    setSelectedGroupes(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allKeys = filteredExamens.map(groupe => 
        `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`
      );
      setSelectedGroupes(new Set(allKeys));
    } else {
      setSelectedGroupes(new Set());
    }
  };

  const getFieldValue = (groupe: ExamenGroupe, field: keyof ExamenGroupe) => {
    const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
    return editingExamens[groupeKey]?.[field] ?? groupe[field];
  };

  const filteredExamens = examensGroupes?.filter(groupe => 
    groupe.code_examen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    groupe.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
    groupe.auditoire_unifie.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <p className="text-center">Chargement des examens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5" />
            <span>Révision des Besoins par Auditoire</span>
          </CardTitle>
          <CardDescription>
            Configurez les besoins en surveillance pour chaque examen et auditoire (groupés par similarité)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions globales */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un examen (code, matière, auditoire)..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-8"
              />
              {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={() => applquerContraintesAuditoiresMutation.mutate()}
              disabled={applquerContraintesAuditoiresMutation.isPending || !contraintesAuditoires}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Appliquer contraintes auditoires
            </Button>
            {selectedGroupes.size > 0 && (
              <Button
                onClick={handleValidateSelected}
                disabled={validateExamensMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider sélection ({selectedGroupes.size})
              </Button>
            )}
          </div>

          {/* Information sur les statuts NON_TRAITE */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">À propos du statut "NON_TRAITE"</h4>
            <p className="text-sm text-blue-700">
              Les examens apparaissent comme "NON_TRAITE" car ils n'ont pas encore été validés dans le processus de validation des examens. 
              Une fois validés, ils passeront automatiquement au statut "VALIDE" et pourront être utilisés pour l'attribution des surveillants.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedGroupes.size === filteredExamens.length && filteredExamens.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Code/Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Auditoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Enseig.</TableHead>
                  <TableHead>Amenés</TableHead>
                  <TableHead>Pré-ass.</TableHead>
                  <TableHead>À Attrib.</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExamens?.map((groupe) => {
                  const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
                  const contrainteUnifiee = getContrainteUnifiee(groupe.auditoire_unifie, contraintesAuditoires || []);
                  const isSelected = selectedGroupes.has(groupeKey);
                  
                  return (
                    <TableRow key={groupeKey} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectGroupe(groupeKey, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">{groupe.code_examen}</div>
                          <div className="text-sm text-gray-600">{groupe.matiere}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDateBelgian(groupe.date_examen)}</div>
                          <div className="text-gray-500">
                            {groupe.heure_debut} - {groupe.heure_fin}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {groupe.auditoire_unifie}
                          {groupe.examens.length > 1 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {groupe.examens.length} salles
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-800">
                          NON_TRAITE
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={getFieldValue(groupe, 'nombre_surveillants_total') as number}
                          onChange={(e) => handleFieldChange(groupeKey, 'nombre_surveillants_total', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        {contrainteUnifiee && (
                          <div className="text-xs text-purple-600 mt-1">
                            Contrainte: {contrainteUnifiee}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={getFieldValue(groupe, 'surveillants_enseignant_total') as number}
                          onChange={(e) => handleFieldChange(groupeKey, 'surveillants_enseignant_total', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={getFieldValue(groupe, 'surveillants_amenes_total') as number}
                          onChange={(e) => handleFieldChange(groupeKey, 'surveillants_amenes_total', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={getFieldValue(groupe, 'surveillants_pre_assignes_total') as number}
                          onChange={(e) => handleFieldChange(groupeKey, 'surveillants_pre_assignes_total', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-center">
                          {Math.max(0, 
                            (getFieldValue(groupe, 'nombre_surveillants_total') as number) - 
                            (getFieldValue(groupe, 'surveillants_enseignant_total') as number) - 
                            (getFieldValue(groupe, 'surveillants_amenes_total') as number) - 
                            (getFieldValue(groupe, 'surveillants_pre_assignes_total') as number)
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveGroupe(groupe)}
                            disabled={!editingExamens[groupeKey] || updateExamenMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleValidateGroupe(groupe)}
                            disabled={validateExamensMutation.isPending}
                            className="border-green-200 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredExamens && filteredExamens.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun examen trouvé pour cette recherche' : 'Aucun examen non traité trouvé'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Importez et validez des examens pour les voir apparaître ici
              </p>
            </div>
          )}

          {filteredExamens && filteredExamens.length > 0 && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-blue-600">
                    {filteredExamens.length}
                    {searchTerm && examensGroupes && ` / ${examensGroupes.length}`}
                  </div>
                  <div className="text-blue-800">
                    {searchTerm ? 'Examens trouvés' : 'Examens groupés'}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-green-600">
                    {filteredExamens.reduce((sum, g) => sum + Math.max(0, 
                      (g.nombre_surveillants_total || 0) - 
                      (g.surveillants_enseignant_total || 0) - 
                      (g.surveillants_amenes_total || 0) - 
                      (g.surveillants_pre_assignes_total || 0)
                    ), 0)}
                  </div>
                  <div className="text-green-800">Total à attribuer</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-purple-600">
                    {new Set(filteredExamens.map(g => g.auditoire_unifie)).size}
                  </div>
                  <div className="text-purple-800">Auditoires unifiés</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-orange-600">
                    {new Set(filteredExamens.map(g => g.date_examen)).size}
                  </div>
                  <div className="text-orange-800">Jours d'examens</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
