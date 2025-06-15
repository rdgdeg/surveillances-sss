
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Users, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AmenesSurveillantsFields } from "./AmenesSurveillantsFields";

interface PersonneAmenee {
  nom: string;
  prenom: string;
  est_assistant?: boolean;
}

interface EnseignantPresenceFormProps {
  selectedExamen: any;
  updateEnseignantPresenceMutation: any;
  surveillantsTheoriques?: number;
  surveillantsNecessaires?: number;
  onPresenceSaved?: () => void;
}

export const EnseignantPresenceForm = ({
  selectedExamen,
  updateEnseignantPresenceMutation,
  surveillantsTheoriques,
  surveillantsNecessaires,
  onPresenceSaved,
}: EnseignantPresenceFormProps) => {
  const [enseignantPresent, setEnseignantPresent] = useState(true);
  const [nomEnseignant, setNomEnseignant] = useState("");
  const [personnesAmenees, setPersonnesAmenees] = useState(0);
  const [detailsPersonnesAmenees, setDetailsPersonnesAmenees] = useState<PersonneAmenee[]>([]);
  const [informationsMisesAJour, setInformationsMisesAJour] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedExamen) {
      // Pré-remplir avec les données existantes
      setEnseignantPresent((selectedExamen.surveillants_enseignant || 0) > 0);
      setNomEnseignant(selectedExamen.enseignant_nom || selectedExamen.enseignants || "");
      setPersonnesAmenees(selectedExamen.surveillants_amenes || 0);
      
      // Initialiser les détails des personnes amenées depuis la base de données
      const personnesExistantes = selectedExamen.personnes_aidantes?.filter(
        (p: any) => p.ajoute_par === 'enseignant_amene'
      ) || [];
      
      const nombrePersonnes = selectedExamen.surveillants_amenes || 0;
      const initDetails = Array(nombrePersonnes).fill(null).map((_, index) => {
        const personneExistante = personnesExistantes[index];
        return personneExistante ? {
          nom: personneExistante.nom,
          prenom: personneExistante.prenom,
          est_assistant: personneExistante.est_assistant || false
        } : { nom: "", prenom: "", est_assistant: false };
      });
      setDetailsPersonnesAmenees(initDetails);
      
      // Vérifier si les informations ont déjà été mises à jour
      setInformationsMisesAJour(selectedExamen.surveillants_enseignant !== null || selectedExamen.surveillants_amenes > 0);
    }
  }, [selectedExamen]);

  // Calculer les surveillants restants à attribuer
  const calculerSurveillantsRestants = () => {
    const theoriques = surveillantsTheoriques || 0;
    const enseignant = enseignantPresent ? 1 : 0;
    const amenes = personnesAmenees || 0;
    return Math.max(0, theoriques - enseignant - amenes);
  };

  // Gérer le changement du nombre de personnes amenées
  const handlePersonnesAmeneesChange = (nombre: number) => {
    setPersonnesAmenees(nombre);
    
    // Ajuster le tableau des détails
    const nouveauxDetails = Array(nombre).fill(null).map((_, index) => 
      detailsPersonnesAmenees[index] || { nom: "", prenom: "", est_assistant: false }
    );
    setDetailsPersonnesAmenees(nouveauxDetails);
  };

  const handleSave = async () => {
    await updateEnseignantPresenceMutation.mutateAsync({
      examenId: selectedExamen.id,
      enseignantPresent,
      nomEnseignant,
      personnesAmenees,
      detailsPersonnesAmenees,
    });
    queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
    setInformationsMisesAJour(true);
    toast({
      title: "Informations mises à jour",
      description: "Vos informations de présence ont été sauvegardées.",
      variant: "default"
    });
    if (onPresenceSaved) onPresenceSaved();
  };

  return (
    <div className="space-y-6">
      {/* Section présence enseignant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Présence de l'enseignant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="enseignant-present"
              checked={enseignantPresent}
              onCheckedChange={(checked) => setEnseignantPresent(!!checked)}
            />
            <Label htmlFor="enseignant-present" className="text-base">
              L'enseignant assure la surveillance
            </Label>
          </div>
          
          {enseignantPresent && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="nom-enseignant">
                Nom de l'enseignant
              </Label>
              <Input
                id="nom-enseignant"
                type="text"
                value={nomEnseignant}
                onChange={(e) => setNomEnseignant(e.target.value)}
                placeholder="Nom de l'enseignant"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section personnes présentes sur place */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Personnes présentes sur place</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-3 py-2 rounded-lg bg-orange-50 mb-2">
            <span className="font-medium text-orange-700">
              Surveillants restants à attribuer : <span className="font-bold">{calculerSurveillantsRestants()}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personnes-amenees">
              Nombre de personnes présentes sur place (en plus de l'enseignant)
            </Label>
            <Input
              id="personnes-amenees"
              type="number"
              min="0"
              max="10"
              value={personnesAmenees}
              onChange={(e) => handlePersonnesAmeneesChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-32"
            />
            <p className="text-sm text-gray-600">
              Indiquez le nombre de personnes (assistants, collègues) qui seront présentes sur place pour aider à la surveillance.
            </p>
          </div>

          {/* Champs dynamiques pour les noms/prénoms */}
          {personnesAmenees > 0 && (
            <div className="mt-4">
              <Label className="block mb-2 font-medium">Détails des personnes présentes sur place</Label>
              <AmenesSurveillantsFields 
                nombre={personnesAmenees}
                personnes={detailsPersonnesAmenees}
                setPersonnes={setDetailsPersonnesAmenees}
              />
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={updateEnseignantPresenceMutation.isPending}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            Mettre à jour les informations
          </Button>
        </CardContent>
      </Card>

      {/* Indicateur si les informations ont été mises à jour */}
      {informationsMisesAJour && (
        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <span className="font-medium text-green-700">
            ✓ Informations mises à jour - Vous pouvez maintenant confirmer vos besoins
          </span>
        </div>
      )}
    </div>
  );
};
