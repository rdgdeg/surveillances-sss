
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Users } from "lucide-react";
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
  const [personnesAmenees, setPersonnesAmenees] = useState(0);
  const [detailsPersonnesAmenees, setDetailsPersonnesAmenees] = useState<PersonneAmenee[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedExamen) {
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
    }
  }, [selectedExamen]);

  // Calculer les surveillants restants à attribuer
  const calculerSurveillantsRestants = () => {
    const theoriques = surveillantsTheoriques || 0;
    const enseignant = 1; // L'enseignant est toujours présent
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
      enseignantPresent: true, // Toujours présent
      personnesAmenees,
      detailsPersonnesAmenees,
    });
    queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
    toast({
      title: "Informations mises à jour",
      description: "Vos informations de présence ont été sauvegardées.",
      variant: "default"
    });
    if (onPresenceSaved) onPresenceSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Personnes que vous amenez</span>
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
            Nombre de personnes que j'amène
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
            Indiquez le nombre de personnes (assistants, collègues) que vous amenez pour aider à la surveillance.
          </p>
        </div>

        {/* Champs dynamiques pour les noms/prénoms */}
        {personnesAmenees > 0 && (
          <div className="mt-4">
            <Label className="block mb-2 font-medium">Détails des personnes amenées</Label>
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
  );
};
