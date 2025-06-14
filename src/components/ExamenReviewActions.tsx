import { Button } from "@/components/ui/button";

interface ExamenReviewActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selected: boolean) => void;
  onApplyConstraints: () => void;
  onValidateSelected: () => void;
  onDeleteSelected: () => void;
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
  onDeleteSelected,
  isApplyingConstraints,
  isValidating,
  hasConstraints
}: ExamenReviewActionsProps) => (
  <div className="flex flex-wrap gap-2 items-center mb-2">
    <input
      type="checkbox"
      className="mr-2"
      checked={selectedCount === totalCount && totalCount > 0}
      onChange={e => onSelectAll(e.target.checked)}
    />
    <span className="text-sm">{selectedCount} sélectionné(s) / {totalCount}</span>

    <Button variant="outline" disabled={isApplyingConstraints || !hasConstraints} onClick={onApplyConstraints}>
      Appliquer contraintes salle
    </Button>
    <Button variant="outline" disabled={isValidating || selectedCount === 0} onClick={onValidateSelected}>
      Valider la sélection
    </Button>
    {/* Nouveau bouton suppression */}
    <Button variant="destructive" disabled={selectedCount === 0} onClick={onDeleteSelected}>
      Supprimer la sélection
    </Button>
  </div>
)
