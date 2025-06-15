
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Rafraîchit l’examen après modif pour avoir feedback immédiat
interface EnseignantPresenceFormProps {
  selectedExamen: any;
  updateEnseignantPresenceMutation: any;
  surveillantsTheoriques?: number;
  surveillantsNecessaires?: number;
  onPresenceSaved?: () => void; // <---- NEW
}

export const EnseignantPresenceForm = ({
  selectedExamen,
  updateEnseignantPresenceMutation,
  surveillantsTheoriques,
  surveillantsNecessaires,
  onPresenceSaved, // <---- NEW
}: EnseignantPresenceFormProps) => {
  const [enseignantPresent, setEnseignantPresent] = useState(false);
  const [personnesAmenees, setPersonnesAmenees] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedExamen) {
      setEnseignantPresent((selectedExamen.surveillants_enseignant || 0) > 0);
      setPersonnesAmenees(selectedExamen.surveillants_amenes || 0);
    }
  }, [selectedExamen]);

  const handleSave = async () => {
    await updateEnseignantPresenceMutation.mutateAsync({
      examenId: selectedExamen.id,
      enseignantPresent,
      personnesAmenees,
    });
    // Rafraîchir les examens pour avoir la donnée à jour
    queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
    toast({
      title: "Présence enregistrée",
      description: "Vos informations ont bien été sauvegardées.",
      variant: "default"
    });
    if (onPresenceSaved) onPresenceSaved(); // <---- NEW: trigger refresh
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Présence de l'enseignant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* State and summary */}
        <div className="px-3 py-2 rounded-lg bg-gray-50 mb-2 flex flex-col space-y-1">
          <span className="font-medium text-gray-700">
            Surveillants nécessaires : <span className="text-blue-700 font-bold">{surveillantsTheoriques}</span>
          </span>
          <span className="font-medium text-gray-700">
            Surveillants restants à attribuer : <span className="text-orange-600 font-bold">{surveillantsNecessaires}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enseignant-present"
            checked={enseignantPresent}
            onCheckedChange={(checked) => setEnseignantPresent(!!checked)}
          />
          <Label htmlFor="enseignant-present">
            Je serai présent pour la surveillance
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="personnes-amenees">
            Nombre de personnes que j'amène
          </Label>
          <Input
            id="personnes-amenees"
            type="number"
            min="0"
            value={personnesAmenees}
            onChange={(e) => setPersonnesAmenees(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-32"
          />
          <p className="text-sm text-gray-600">
            Indiquez le nombre de personnes (assistants, collègues) que vous amenez pour aider à la surveillance.
          </p>
        </div>

        <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
          <div>
            <span className="font-semibold">Présence enregistrée :</span>
            <span> Professeur&nbsp;
              {selectedExamen.surveillants_enseignant > 0 ? (
                <span className="text-green-700 font-semibold">PRÉSENT</span>
              ) : (
                <span className="text-red-700 font-semibold">ABSENT</span>
              )}
            </span>
            &nbsp;|&nbsp;
            <span>
              Personnes amenées : <span className="font-semibold">{selectedExamen.surveillants_amenes ?? 0}</span>
            </span>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateEnseignantPresenceMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          Sauvegarder la présence
        </Button>
      </CardContent>
    </Card>
  );
};
