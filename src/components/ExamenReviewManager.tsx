
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { DeleteAllExamensButton } from "@/components/DeleteAllExamensButton";
import { ExamenReviewFilters } from "@/components/ExamenReviewFilters";
import { ExamenReviewActions } from "@/components/ExamenReviewActions";
import { ExamenReviewTable } from "@/components/ExamenReviewTable";
import { ExamenReviewStats } from "@/components/ExamenReviewStats";
import { useExamenReview } from "@/hooks/useExamenReview";
import { 
  groupExamens, 
  generateSearchTerms, 
  filterExamens, 
  calculateStats, 
  getContrainteUnifiee,
  ExamenGroupe 
} from "@/utils/examenReviewUtils";

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

  // Grouper et fusionner les examens par code/date/heure + auditoire unifié
  const examensGroupes = useMemo(() => {
    if (!examens || !contraintesAuditoires) return [];
    return groupExamens(examens, contraintesAuditoires);
  }, [examens, contraintesAuditoires]);

  // Suggestions pour l'autocomplétion
  const allSearchTerms = useMemo(() => {
    return generateSearchTerms(examensGroupes);
  }, [examensGroupes]);

  // Examens filtrés
  const filteredExamens = useMemo(() => {
    return filterExamens(examensGroupes, searchTerm);
  }, [examensGroupes, searchTerm]);

  // Statistiques
  const stats = useMemo(() => {
    return calculateStats(filteredExamens);
  }, [filteredExamens]);

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

          {/* Information sur les statuts NON_TRAITE */}
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
    </div>
  );
};
