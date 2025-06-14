
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface CommentaireSurveillanceSectionProps {
  creneauId: string;
  commentaire: string;
  nomExamen: string;
  onCommentaireChange: (creneauId: string, commentaire: string) => void;
  onNomExamenChange: (creneauId: string, nomExamen: string) => void;
}

export function CommentaireSurveillanceSection({
  creneauId,
  commentaire,
  nomExamen,
  onCommentaireChange,
  onNomExamenChange
}: CommentaireSurveillanceSectionProps) {
  const [showFields, setShowFields] = useState(false);

  return (
    <div className="mt-2 border-l-2 border-orange-300 pl-3">
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox
          id={`surveillance-obligatoire-${creneauId}`}
          checked={showFields}
          onCheckedChange={(checked) => {
            setShowFields(!!checked);
            if (!checked) {
              onCommentaireChange(creneauId, "");
              onNomExamenChange(creneauId, "");
            }
          }}
        />
        <Label 
          htmlFor={`surveillance-obligatoire-${creneauId}`}
          className="text-sm text-orange-700 font-medium flex items-center space-x-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>J'ai une surveillance obligatoire pendant ce créneau</span>
        </Label>
      </div>
      
      {showFields && (
        <div className="space-y-2 bg-orange-50 p-3 rounded-lg">
          <div>
            <Label className="text-xs text-gray-600">Nom de l'examen obligatoire</Label>
            <Input
              value={nomExamen}
              onChange={(e) => onNomExamenChange(creneauId, e.target.value)}
              placeholder="Ex: LPHYS1234 - Physique générale"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Commentaire (optionnel)</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => onCommentaireChange(creneauId, e.target.value)}
              placeholder="Précisions sur cette surveillance obligatoire..."
              className="text-sm h-16"
            />
          </div>
        </div>
      )}
    </div>
  );
}
