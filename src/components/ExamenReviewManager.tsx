import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Upload } from "lucide-react";
import { DeleteAllExamensButton } from "@/components/DeleteAllExamensButton";
import { ExamenReviewFilters } from "@/components/ExamenReviewFilters";
import { ExamenReviewActions } from "@/components/ExamenReviewActions";
import { ExamenReviewTable } from "@/components/ExamenReviewTable";
import { ExamenReviewStats } from "@/components/ExamenReviewStats";
import { ExamenImportSection } from "@/components/ExamenImportSection";
import { useExamenReview } from "@/hooks/useExamenReview";
import { 
  groupExamens, 
  generateSearchTerms, 
  filterExamens, 
  calculateStats, 
  getContrainteUnifiee,
  ExamenGroupe 
} from "@/utils/examenReviewUtils";
import { ExamensAdvancedFilter } from "./ExamensAdvancedFilter";

export const ExamenReviewManager = () => {
  const {
    examens,
    contraintesAuditoires,
    isLoading,
    editingExamens,
    setEditingExamens,
    selectedGroupes,
    setSelectedGroupes,
    updateExamenMutation,
    validateExamensMutation,
    applquerContraintesAuditoiresMutation,
    activeSession
  } = useExamenReview();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [extraFilter, setExtraFilter] = useState<{pattern?: string; type?: "prefix"|"suffix"|"contain"}>({});
  const [facultyFilter, setFacultyFilter] = useState<string>("ALL");

  // Grouper et fusionner les examens par code/date/heure + auditoire unifié
  const examensGroupes = useMemo(() => {
    if (!examens || !contraintesAuditoires) return [];
    return groupExamens(examens, contraintesAuditoires);
  }, [examens, contraintesAuditoires]);

  // --- FIX: Compute allSearchTerms for suggestions ---
  const allSearchTerms = useMemo(() => generateSearchTerms(examensGroupes), [examensGroupes]);

  // Nouveau: filtrage avancé
  const filteredByExtra = useMemo(() => {
    if (!extraFilter.pattern) return examensGroupes;
    const pat = extraFilter.pattern.toLowerCase() || "";
    return examensGroupes.filter(groupe => {
      if (!groupe.code_examen) return false;
      if (extraFilter.type === "prefix") return groupe.code_examen.toLowerCase().startsWith(pat);
      if (extraFilter.type === "suffix") return groupe.code_examen.toLowerCase().endsWith(pat);
      return groupe.code_examen.toLowerCase().includes(pat);
    });
  }, [examensGroupes, extraFilter]);

  // Nouveau: filtrage faculté
  const filteredExamens = useMemo(() => {
    if (facultyFilter === "ALL") return filteredByExtra;
    return filteredByExtra.filter(groupe => (facultyFilter === "NO_FAC" ? !groupe.faculte : groupe.faculte === facultyFilter));
  }, [filteredByExtra, facultyFilter]);

  // --- FIX: Compute stats for filteredExamens ---
  const stats = useMemo(() => calculateStats(filteredExamens), [filteredExamens]);

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

  const handleBulkAssignFaculty = (groupeKeys: string[], faculty: string) => {
    setEditingExamens(prev => {
      const updates = { ...prev };
      groupeKeys.forEach(key => {
        updates[key] = { ...updates[key], faculte: faculty };
      });
      return updates;
    });
  };

  const getFieldValue = (groupe: ExamenGroupe, field: keyof ExamenGroupe) => {
    const groupeKey = `${groupe.code_examen}-${groupe.date_examen}-${groupe.heure_debut}-${groupe.auditoire_unifie}`;
    return editingExamens[groupeKey]?.[field] ?? groupe[field];
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
          <p className="text-center">Chargement des examens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Étape assignation des facultés et filtrage */}
      <ExamensAdvancedFilter
        examens={examensGroupes}
        onBulkAssignFaculty={handleBulkAssignFaculty}
        setFilter={(pattern, type) => setExtraFilter({ pattern, type })}
        facultyOptions={["MEDE", "FASB", "FSM", "FSP", "INCONNU"]}
      />
      <div className="flex items-center gap-2 mb-4">
        <span>Filtrer par faculté :</span>
        <select
          className="border px-2 py-1 rounded"
          value={facultyFilter}
          onChange={e => setFacultyFilter(e.target.value)}
        >
          <option value="ALL">Toutes</option>
          <option value="NO_FAC">Sans faculté</option>
          <option value="MEDE">MEDE</option>
          <option value="FSM">FSM</option>
          <option value="FASB">FASB</option>
          <option value="FSP">FSP</option>
          <option value="INCONNU">INCONNU</option>
        </select>
        <span className="text-xs text-gray-500">
          (Astuce : filtrez "sans faculté" pour vérifier que tous les examens sont assignés)
        </span>
      </div>
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center space-x-2">
            <ClipboardList className="h-4 w-4" />
            <span>Révision</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-4">
          <ExamenImportSection />
        </TabsContent>
        
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <ClipboardList className="h-5 w-5" />
                    <span>Révision des Besoins par Auditoire</span>
                  </CardTitle>
                  <CardDescription>
                    Configurez les besoins en surveillance pour chaque examen et auditoire (groupés par similarité)
                  </CardDescription>
                </div>
                <DeleteAllExamensButton />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExamenReviewActions
                selectedCount={selectedGroupes.size}
                totalCount={filteredExamens.length}
                onSelectAll={handleSelectAll}
                onApplyConstraints={() => applquerContraintesAuditoiresMutation.mutate()}
                onValidateSelected={handleValidateSelected}
                isApplyingConstraints={applquerContraintesAuditoiresMutation.isPending}
                isValidating={validateExamensMutation.isPending}
                hasConstraints={!!contraintesAuditoires}
              />

              <ExamenReviewFilters
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                searchSuggestions={searchSuggestions}
                showSuggestions={showSuggestions}
                onSelectSuggestion={selectSuggestion}
                onSuggestionsVisibilityChange={setShowSuggestions}
              />

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">À propos du statut "NON_TRAITE"</h4>
                <p className="text-sm text-blue-700">
                  Les examens apparaissent comme "NON_TRAITE" car ils n'ont pas encore été validés dans le processus de validation des examens. 
                  Une fois validés, ils passeront automatiquement au statut "VALIDE" et pourront être utilisés pour l'attribution des surveillants.
                </p>
              </div>

              <ExamenReviewTable
                examens={filteredExamens}
                selectedGroupes={selectedGroupes}
                editingExamens={editingExamens}
                contraintes={contraintesAuditoires || []}
                onSelectGroupe={handleSelectGroupe}
                onFieldChange={handleFieldChange}
                onSaveGroupe={handleSaveGroupe}
                onValidateGroupe={handleValidateGroupe}
                isSaving={updateExamenMutation.isPending}
                isValidating={validateExamensMutation.isPending}
                getFieldValue={getFieldValue}
                getContrainteUnifiee={getContrainteUnifiee}
              />

              {filteredExamens && filteredExamens.length > 0 && (
                <ExamenReviewStats
                  filteredCount={filteredExamens.length}
                  totalCount={examensGroupes?.length}
                  searchTerm={searchTerm}
                  totalToAssign={stats.totalToAssign}
                  uniqueAuditoires={stats.uniqueAuditoires}
                  uniqueDays={stats.uniqueDays}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
