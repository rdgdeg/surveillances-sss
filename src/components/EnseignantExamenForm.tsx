import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Search, MapPin, Filter, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";

import { ExamenRecap } from "./ExamenRecap";
import { EnseignantPresenceForm } from "./EnseignantPresenceForm";
import { ExamenAutocomplete } from "./ExamenAutocomplete";
import { useExamenMutations } from "@/hooks/useExamenMutations";
import { useExamenCalculations } from "@/hooks/useExamenCalculations";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";
import { formatSession } from "@/utils/sessionUtils";

export const EnseignantExamenForm = () => {
  const { data: activeSession } = useActiveSession();
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [informationsMisesAJour, setInformationsMisesAJour] = useState(false);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('');
  const [heureDebutFilter, setHeureDebutFilter] = useState('');
  const [heureFinFilter, setHeureFinFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: examensValides, isLoading: examensLoading } = useQuery({
    queryKey: ['examens-enseignant', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      console.log('Fetching all exams for session:', activeSession.id);
      
      const { data, error } = await supabase
        .from('examens')
        .select(`*, personnes_aidantes (*), enseignant_nom, enseignant_email`)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');
      
      if (error) {
        console.error('Error fetching exams:', error);
        throw error;
      }
      
      console.log('Fetched exams count:', data?.length || 0);
      return data || [];
    },
    enabled: !!activeSession?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter examens based on date and time filters
  const examensFiltered = examensValides?.filter(examen => {
    if (dateFilter && examen.date_examen !== dateFilter) {
      return false;
    }
    if (heureDebutFilter && examen.heure_debut < heureDebutFilter) {
      return false;
    }
    if (heureFinFilter && examen.heure_fin > heureFinFilter) {
      return false;
    }
    return true;
  }) || [];

  const { 
    confirmerExamenMutation,
    updateEnseignantPresenceMutation
  } = useExamenMutations();

  // Get constraints for available auditoires
  const { data: contraintesAuditoires, isLoading: contraintesLoading } = useContraintesAuditoires();
  const {
    getTheoreticalSurveillants,
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires
  } = useExamenCalculations(selectedExamen);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setDateFilter('');
    setHeureDebutFilter('');
    setHeureFinFilter('');
  };

  const hasActiveFilters = dateFilter || heureDebutFilter || heureFinFilter;

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active trouvée.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Refetch examen by id, update selectedExamen in state
  const refreshSelectedExamen = async (id: string) => {
    const { data, error } = await supabase
      .from('examens')
      .select(`*, personnes_aidantes (*), enseignant_nom, enseignant_email`)
      .eq('id', id)
      .maybeSingle();
    if (data) {
      setSelectedExamen(data);
      // Vérifier si les informations ont été mises à jour
      setInformationsMisesAJour(data.surveillants_enseignant !== null || data.surveillants_amenes > 0);
    }
  };

  const handleSelectExamen = (examen: any) => {
    console.log('Selected exam:', examen);
    setSelectedExamen(examen);
    // Vérifier si les informations ont été mises à jour
    setInformationsMisesAJour(examen.surveillants_enseignant !== null || examen.surveillants_amenes > 0);
  };

  const handlePresenceSaved = () => {
    setInformationsMisesAJour(true);
    refreshSelectedExamen(selectedExamen.id);
  };

  if (examensLoading) {
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
            <Search className="h-5 w-5" />
            <span>Rechercher votre examen</span>
            <span className="text-sm text-gray-500">
              • Session: {formatSession(activeSession.name)}
            </span>
          </CardTitle>
          <CardDescription>
            Utilisez la recherche pour trouver votre examen et renseigner vos besoins de surveillance
            {examensValides && (
              <span className="block mt-1 text-sm text-blue-600">
                {examensFiltered.length} examen{examensFiltered.length > 1 ? 's' : ''} affiché{examensFiltered.length > 1 ? 's' : ''} 
                {hasActiveFilters && ` (${examensValides.length} au total)`}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter toggle button */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres</span>
              {hasActiveFilters && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {[dateFilter, heureDebutFilter, heureFinFilter].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center space-x-1 text-gray-600"
              >
                <X className="h-4 w-4" />
                <span>Effacer les filtres</span>
              </Button>
            )}
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-filter">Date d'examen</Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    placeholder="Filtrer par date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heure-debut-filter">Heure de début (après)</Label>
                  <Input
                    id="heure-debut-filter"
                    type="time"
                    value={heureDebutFilter}
                    onChange={(e) => setHeureDebutFilter(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heure-fin-filter">Heure de fin (avant)</Label>
                  <Input
                    id="heure-fin-filter"
                    type="time"
                    value={heureFinFilter}
                    onChange={(e) => setHeureFinFilter(e.target.value)}
                    placeholder="HH:MM"
                  />
                </div>
              </div>
            </div>
          )}

          <ExamenAutocomplete
            examens={examensFiltered}
            selectedExamen={selectedExamen}
            onSelectExamen={handleSelectExamen}
            placeholder="Recherchez par code, matière, salle ou nom d'enseignant..."
          />
          {examensFiltered.length === 0 && examensValides && examensValides.length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800">
                Aucun examen ne correspond aux filtres sélectionnés. 
                {hasActiveFilters && "Essayez d'ajuster ou de supprimer les filtres."}
              </p>
            </div>
          )}
          {examensValides && examensValides.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                Aucun examen validé trouvé pour cette session. 
                Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExamen && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <ExamenRecap selectedExamen={selectedExamen} formatDate={formatDate} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-stretch bg-gray-50 rounded-xl px-2 py-2 mb-4">
                <BlocResume
                  nombre={getTheoreticalSurveillants()}
                  titre="Surveillants théoriques"
                  color="text-blue-700"
                />
                <BlocResume
                  nombre={calculerSurveillantsPedagogiques()}
                  titre="Équipe pédagogique"
                  color="text-green-700"
                />
                <BlocResume
                  nombre={calculerSurveillantsNecessaires()}
                  titre="Surveillants à attribuer"
                  color="text-orange-600"
                />
              </div>

              {/* Affichage des auditoires */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Auditoires prévus</span>
                </div>
                <p className="text-blue-700">{selectedExamen.salle || "Non spécifié"}</p>
              </div>
            </CardContent>
          </Card>

          <EnseignantPresenceForm
            selectedExamen={selectedExamen}
            updateEnseignantPresenceMutation={updateEnseignantPresenceMutation}
            surveillantsTheoriques={getTheoreticalSurveillants()}
            surveillantsNecessaires={calculerSurveillantsNecessaires()}
            onPresenceSaved={handlePresenceSaved}
          />

          <Card>
            <CardContent className="space-y-6 pt-6">
              {!informationsMisesAJour && (
                <div className="px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                  <span className="font-medium text-yellow-700">
                    ⚠️ Vous devez mettre à jour vos informations avant de confirmer vos besoins
                  </span>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => confirmerExamenMutation.mutate(selectedExamen.id)}
                  disabled={
                    confirmerExamenMutation.isPending || 
                    selectedExamen.besoins_confirmes_par_enseignant ||
                    !informationsMisesAJour
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  {selectedExamen.besoins_confirmes_par_enseignant ? "Déjà confirmé" : "Confirmer les besoins"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const BlocResume = ({ nombre, titre, color }: { nombre: number, titre: string, color: string }) => (
  <div className="flex flex-col items-center justify-center flex-1 py-2">
    <div className={`text-3xl font-bold ${color}`}>{nombre}</div>
    <div className="text-base text-gray-600">{titre}</div>
  </div>
);
