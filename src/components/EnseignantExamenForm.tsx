import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Search, Users, Calendar, Clock, MapPin, Trash2, ListFilter } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

import { RechercheExamenSection } from "./RechercheExamenSection";
import { ExamenRecap } from "./ExamenRecap";
import { EquipePedagogiqueForm } from "./EquipePedagogiqueForm";
import { useExamenManagement } from "@/hooks/useExamenManagement";
import { usePersonnesEquipe } from "@/hooks/usePersonnesEquipe";
import { useExamenMutations } from "@/hooks/useExamenMutations";
import { useExamenCalculations } from "@/hooks/useExamenCalculations";

export const EnseignantExamenForm = () => {
  // --------- GESTION DES ETATS ET HOOKS OPTIMISES ---------
  const {
    activeSession,
    searchCode,
    setSearchCode,
    selectedExamen,
    setSelectedExamen,
    faculteFilter,
    setFaculteFilter,
    dateFilter,
    setDateFilter,
    examensValides,
    faculteList,
    filteredExamens,
    examenTrouve,
  } = useExamenManagement();

  const { personnesEquipe, setPersonnesEquipe, nombrePersonnes, setNombrePersonnes } = usePersonnesEquipe();

  // Remise à zéro du formulaire si ajout réussi
  const { ajouterPersonneMutation, supprimerPersonneMutation, confirmerExamenMutation } =
    useExamenMutations({
      onPersonneAdded: () => {
        setPersonnesEquipe(Array(nombrePersonnes).fill({
          nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true
        }));
      }
    });

  const { calculerSurveillantsPedagogiques, calculerSurveillantsNecessaires } = useExamenCalculations(selectedExamen);

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

  // --------- AFFICHAGE UI ---------
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>
              <span className="inline-block align-middle">{/* icon slot */}</span>
            </span>
            <span>Rechercher votre examen</span>
          </CardTitle>
          <CardDescription>
            Entrez le code de votre examen ou sélectionnez-le ci-dessous pour renseigner vos besoins de surveillance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RechercheExamenSection
            searchCode={searchCode}
            setSearchCode={setSearchCode}
            examenTrouve={examenTrouve}
            setSelectedExamen={setSelectedExamen}
            filteredExamens={filteredExamens}
            faculteFilter={faculteFilter}
            setFaculteFilter={setFaculteFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            faculteList={faculteList}
            selectedExamen={selectedExamen}
          />
        </CardContent>
      </Card>

      {selectedExamen && (
        <Card>
          <CardHeader>
            <CardTitle>
              <ExamenRecap selectedExamen={selectedExamen} formatDate={formatDate} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-stretch bg-gray-50 rounded-xl px-2 py-2 mb-2">
              <BlocResume
                nombre={selectedExamen.nombre_surveillants}
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
