
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CheckCircle } from "lucide-react";

interface ExamenReviewActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
  onApplyConstraints: () => void;
  onValidateSelected: () => void;
  isApplyingConstraints: boolean;
  isValidating: boolean;
  hasConstraints: boolean;
}

export const ExamenReviewActions = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onApplyConstraints,
  onValidateSelected,
  isApplyingConstraints,
  isValidating,
  hasConstraints
}: ExamenReviewActionsProps) => {
  return (
    <div className="flex gap-4 items-center flex-wrap">
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={selectedCount === totalCount && totalCount > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm">Tout sélectionner</span>
      </div>
      
      <Button
        onClick={onApplyConstraints}
        disabled={isApplyingConstraints || !hasConstraints}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Building2 className="h-4 w-4 mr-2" />
        Appliquer contraintes auditoires
      </Button>
      
      {selectedCount > 0 && (
        <Button
          onClick={onValidateSelected}
          disabled={isValidating}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Valider sélection ({selectedCount})
        </Button>
      )}
    </div>
  );
};
