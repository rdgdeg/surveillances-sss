
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const [enseignantPresent, setEnseignantPresent] = useState(true); // Par défaut présent
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
    queryClient.invalidateQueries({ queryKey: ['examens-enseignant'] });
    toast({
      title: "Informations mises à jour",
      description: "Vos informations de présence ont été sauvegardées.",
      variant: "default"
    });
    if (onPresenceSaved) onPresenceSaved();
  };

  return (
    <div className="space-y-4">
      {/* Présence de l'enseignant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Votre présence à la surveillance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-3 py-2 rounded-lg bg-blue-50 mb-2">
            <span className="font-medium text-blue-700">
              Surveillants théoriques nécessaires : <span className="font-bold">{surveillantsTheoriques}</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enseignant-present"
              checked={enseignantPresent}
              onCheckedChange={(checked) => setEnseignantPresent(!!checked)}
            />
            <Label htmlFor="enseignant-present" className="font-medium">
              Je serai présent pour assurer la surveillance
            </Label>
          </div>

          <p className="text-sm text-gray-600">
            Par défaut, nous considérons que vous serez présent. Décochez si vous ne pouvez pas assurer la surveillance.
          </p>
        </CardContent>
      </Card>

      {/* Personnes amenées */}
      <Card>
        <CardHeader>
          <CardTitle>Personnes que vous amenez</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="px-3 py-2 rounded-lg bg-orange-50 mb-2">
            <span className="font-medium text-orange-700">
              Surveillants restants à attribuer : <span className="font-bold">{surveillantsNecessaires}</span>
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
              value={personnesAmenees}
              onChange={(e) => setPersonnesAmenees(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-32"
            />
            <p className="text-sm text-gray-600">
              Indiquez le nombre de personnes (assistants, collègues) que vous amenez pour aider à la surveillance.
            </p>
          </div>

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
    </div>
  );
};
