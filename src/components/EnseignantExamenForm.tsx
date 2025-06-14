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

export const EnseignantExamenForm = () => {
  // --- ALL HOOKS MUST BE HERE AT THE TOP LEVEL ---

  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [newPersonne, setNewPersonne] = useState({
    nom: "",
    prenom: "",
    email: "",
    est_assistant: false,
    compte_dans_quota: true,
    present_sur_place: true
  });
  // Nouveaux filtres
  const [faculteFilter, setFaculteFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const [nombrePersonnes, setNombrePersonnes] = useState(1); // Par défaut 1 personne à ajouter
  const [personnesEquipe, setPersonnesEquipe] = useState([
    { nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true }
  ]);

  const { data: examensValides } = useQuery({
    queryKey: ['examens-enseignant', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from('examens')
        .select(`
          *,
          personnes_aidantes (*)
        `)
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

  // Liste unique des facultés disponibles
  const faculteList = useMemo(() => {
    if (!examensValides) return [];
    const uniques = Array.from(new Set(examensValides.map((e: any) => e.faculte).filter(Boolean)));
    return uniques;
  }, [examensValides]);

  // Filtrage de la liste
  const filteredExamens = useMemo(() => {
    if (!examensValides) return [];

    return examensValides.filter((ex: any) => {
      if (faculteFilter && ex.faculte !== faculteFilter) return false;
      if (dateFilter && ex.date_examen !== format(dateFilter, "yyyy-MM-dd")) return false;
      // Ne filtre pas sur code ici (on propose toute la liste)
      return true;
    });
  }, [examensValides, faculteFilter, dateFilter]);

  const ajouterPersonneMutation = useMutation({
    mutationFn: async ({ examenId, personne }: { examenId: string; personne: any }) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .insert({
          examen_id: examenId,
          ...personne
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      setNewPersonne({
        nom: "",
        prenom: "",
        email: "",
        est_assistant: false,
        compte_dans_quota: true,
        present_sur_place: true
      });
      toast({
        title: "Personne ajoutée",
        description: "La personne aidante a été ajoutée avec succès."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la personne.",
        variant: "destructive"
      });
    }
  });

  const supprimerPersonneMutation = useMutation({
    mutationFn: async (personneId: string) => {
      const { error } = await supabase
        .from('personnes_aidantes')
        .delete()
        .eq('id', personneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Personne supprimée",
        description: "La personne aidante a été supprimée."
      });
    }
  });

  const confirmerExamenMutation = useMutation({
    mutationFn: async (examenId: string) => {
      const { error } = await supabase
        .from('examens')
        .update({
          besoins_confirmes_par_enseignant: true,
          date_confirmation_enseignant: new Date().toISOString()
        })
        .eq('id', examenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
      toast({
        title: "Examen confirmé",
        description: "Les besoins de surveillance ont été confirmés."
      });
    }
  });

  const examenTrouve = useMemo(() => (
    examensValides?.find(e =>
      e.code_examen?.toLowerCase().includes(searchCode.toLowerCase()))
  ), [examensValides, searchCode]);

  useEffect(() => {
    if (examenTrouve && searchCode) {
      setSelectedExamen(examenTrouve);
    }
  }, [examenTrouve, searchCode]);

  const handleAjouterPersonne = () => {
    if (!selectedExamen || !newPersonne.nom || !newPersonne.prenom) {
      toast({
        title: "Champs requis",
        description: "Nom et prénom sont obligatoires.",
        variant: "destructive"
      });
      return;
    }
    ajouterPersonneMutation.mutate({
      examenId: selectedExamen.id,
      personne: newPersonne
    });
  };

  const calculerSurveillantsPedagogiques = (examen: any) => {
    if (!examen.personnes_aidantes) return 0;
    return examen.personnes_aidantes.filter((p: any) =>
      p.compte_dans_quota && p.present_sur_place
    ).length;
  };

  const calculerSurveillantsNecessaires = (examen: any) => {
    const pedagogiques = calculerSurveillantsPedagogiques(examen);
    const necessaires = Math.max(0, examen.nombre_surveillants - pedagogiques);
    return necessaires;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Lorsque le nombre change, ajuster la taille du tableau personnesEquipe
  useEffect(() => {
    const diff = nombrePersonnes - personnesEquipe.length;
    if (diff > 0) {
      setPersonnesEquipe([
        ...personnesEquipe,
        ...Array(diff).fill({ nom: "", prenom: "", email: "", est_assistant: false, compte_dans_quota: true, present_sur_place: true })
      ]);
    } else if (diff < 0) {
      setPersonnesEquipe(personnesEquipe.slice(0, nombrePersonnes));
    }
    // pas de else : sinon rien à faire si égal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombrePersonnes]);

  // Nouvelle fonction pour ajouter plusieurs personnes d'un coup
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

  // Affichage recap horizontal en flex aligné & style chiffres/color
  const BlocResume = ({ nombre, titre, color }: { nombre: number, titre: string, color: string }) => (
    <div className="flex flex-col items-center justify-center flex-1 py-2">
      <div className={`text-3xl font-bold ${color}`}>{nombre}</div>
      <div className="text-base text-gray-600">{titre}</div>
    </div>
  );

  // HERE: Place conditional returns after hooks are defined
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
                nombre={calculerSurveillantsPedagogiques(selectedExamen)}
                titre="Équipe pédagogique"
                color="text-green-700"
              />
              <BlocResume
                nombre={calculerSurveillantsNecessaires(selectedExamen)}
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
