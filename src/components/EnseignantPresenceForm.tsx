
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Users } from "lucide-react";

interface EnseignantPresenceFormProps {
  selectedExamen: any;
  updateEnseignantPresenceMutation: any;
}

export const EnseignantPresenceForm = ({ selectedExamen, updateEnseignantPresenceMutation }: EnseignantPresenceFormProps) => {
  const [enseignantPresent, setEnseignantPresent] = useState(false);
  const [personnesAmenees, setPersonnesAmenees] = useState(0);

  useEffect(() => {
    if (selectedExamen) {
      setEnseignantPresent(selectedExamen.enseignant_present || false);
      setPersonnesAmenees(selectedExamen.personnes_amenees || 0);
    }
  }, [selectedExamen]);

  const handleSave = () => {
    updateEnseignantPresenceMutation.mutate({
      examenId: selectedExamen.id,
      enseignantPresent,
      personnesAmenees
    });
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
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enseignant-present"
            checked={enseignantPresent}
            onCheckedChange={(checked) => setEnseignantPresent(checked as boolean)}
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
