
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExamenGroupe } from "@/utils/examenReviewUtils";

interface ExamenActivationToggleProps {
  groupe: ExamenGroupe;
  onToggle: (examenId: string, isActive: boolean) => void;
  isLoading: boolean;
}

export const ExamenActivationToggle = ({ groupe, onToggle, isLoading }: ExamenActivationToggleProps) => {
  const isActive = groupe.examens.every(e => e.is_active);
  const hasMixedStatus = groupe.examens.some(e => e.is_active) && groupe.examens.some(e => !e.is_active);

  const handleToggle = (checked: boolean) => {
    groupe.examens.forEach(examen => {
      onToggle(examen.id, checked);
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label className="text-sm">
        {isActive ? "Actif" : "Désactivé"}
      </Label>
      {hasMixedStatus && (
        <Badge variant="outline" className="text-xs">
          Statut mixte
        </Badge>
      )}
    </div>
  );
};
