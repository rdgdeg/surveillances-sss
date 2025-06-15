import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Search, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";

import { ExamenRecap } from "./ExamenRecap";
import { EquipePedagogiqueForm } from "./EquipePedagogiqueForm";
import { EnseignantPresenceForm } from "./EnseignantPresenceForm";
import { ExamenAutocomplete } from "./ExamenAutocomplete";
import { usePersonnesEquipe } from "@/hooks/usePersonnesEquipe";
import { useExamenMutations } from "@/hooks/useExamenMutations";
import { useExamenCalculations } from "@/hooks/useExamenCalculations";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";

export const EnseignantExamenForm = () => {
  const { data: activeSession } = useActiveSession();
  const [selectedExamen, setSelectedExamen] = useState<any>(null);

  const { data: examensValides } = useQuery({
    queryKey: ['examens-enseignant', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from('examens')
        .select(`*, personnes_aidantes (*)`)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const { personnesEquipe, setPersonnesEquipe, nombrePersonnes, setNombrePersonnes } = usePersonnesEquipe();

  const { 
    ajouterPersonneMutation, 
    supprimerPersonneMutation, 
    updateEnseignantPresenceMutation,
    confirmerExamenMutation 
  } = useExamenMutations({
    onPersonneAdded: () => {
      setPersonnesEquipe(Array(nombrePersonnes).fill({
        nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true
      }));
    }
  });

  // Get constraints for available auditoires
  const { data: contraintesAuditoires, isLoading: contraintesLoading } = useContraintesAuditoires();
  const {
    getTheoreticalSurveillants,
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires
  } = useExamenCalculations(selectedExamen);

  const handleAjouterPersonnes = () => {
    if (!selectedExamen) return;
    const personnesValides = personnesEquipe.every(p => p.nom && p.prenom);
    if (!personnesValides) {
      toast({
        title: "Champs requis",
        description: "Nom et prénom sont obligatoires pour chaque personne.",
        variant: "destructive"
      });
      return;
    }
    personnesEquipe.forEach((personne) => {
      ajouterPersonneMutation.mutate({
        examenId: selectedExamen.id,
        personne: personne
      });
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      .select(`*, personnes_aidantes (*)`)
      .eq('id', id)
      .maybeSingle();
    if (data) setSelectedExamen(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Rechercher votre examen</span>
          </CardTitle>
          <CardDescription>
            Utilisez la recherche pour trouver votre examen et renseigner vos besoins de surveillance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExamenAutocomplete
            examens={examensValides || []}
            selectedExamen={selectedExamen}
            onSelectExamen={setSelectedExamen}
            placeholder="Recherchez par code, matière ou salle..."
          />
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
            onPresenceSaved={() => refreshSelectedExamen(selectedExamen.id)}
          />

          <Card>
            <CardContent className="space-y-6 pt-6">
              <EquipePedagogiqueForm
                selectedExamen={selectedExamen}
                ajouterPersonneMutation={ajouterPersonneMutation}
                supprimerPersonneMutation={supprimerPersonneMutation}
                personnesEquipe={personnesEquipe}
                setPersonnesEquipe={setPersonnesEquipe}
                nombrePersonnes={nombrePersonnes}
                setNombrePersonnes={setNombrePersonnes}
                handleAjouterPersonnes={handleAjouterPersonnes}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => confirmerExamenMutation.mutate(selectedExamen.id)}
                  disabled={confirmerExamenMutation.isPending || selectedExamen.besoins_confirmes_par_enseignant}
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
