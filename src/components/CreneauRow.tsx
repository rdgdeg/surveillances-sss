
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { formatDateBelgian } from "@/lib/dateUtils";

interface CreneauRowProps {
  creneauKey: string;
  creneau: {
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
    examenIds: string[];
  };
  value: {
    dispo: boolean;
    type_choix: string;
    nom_examen_selectionne: string;
  };
  onDisponibleChange: (key: string, checked: boolean) => void;
  onTypeChange: (key: string, type: string) => void;
  onNomExamenChange: (key: string, value: string) => void;
}

export const CreneauRow = ({
  creneauKey,
  creneau,
  value,
  onDisponibleChange,
  onTypeChange,
  onNomExamenChange
}: CreneauRowProps) => {
  const isObligatoire = value.dispo && value.type_choix === 'obligatoire';
  
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isObligatoire ? 'bg-green-50 border-green-300' : ''}`}>
      <div className="flex items-center space-x-4">
        <Checkbox
          checked={value.dispo}
          onCheckedChange={(checked) => onDisponibleChange(creneauKey, !!checked)}
        />
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium">
              {formatDateBelgian(creneau.date_examen)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{creneau.heure_debut} - {creneau.heure_fin}</span>
          </div>
          <Badge variant="outline">
            {creneau.examenIds.length} examen{creneau.examenIds.length !== 1 ? 's' : ''}
          </Badge>
          {isObligatoire && (
            <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
              <AlertTriangle className="h-4 w-4 text-green-700" />
              <span className="text-sm font-medium text-green-700">Obligatoire</span>
            </div>
          )}
        </div>
      </div>

      {value.dispo && (
        <div className="ml-6 space-y-3 p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`type_${creneauKey}`}
                checked={value.type_choix === 'souhaitee'}
                onChange={() => onTypeChange(creneauKey, 'souhaitee')}
                className="text-blue-600"
              />
              <span className="text-sm">Surveillance souhaitée</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`type_${creneauKey}`}
                checked={value.type_choix === 'obligatoire'}
                onChange={() => onTypeChange(creneauKey, 'obligatoire')}
                className="text-orange-600"
              />
              <span className="text-sm">Surveillance obligatoire</span>
            </label>
          </div>

          {value.type_choix === 'obligatoire' && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <label className="block text-sm font-medium text-orange-800 mb-2">
                Code ou nom de l'examen obligatoire :
              </label>
              <Input
                value={value.nom_examen_selectionne}
                onChange={(e) => onNomExamenChange(creneauKey, e.target.value)}
                placeholder="Ex: LECON2100 ou Mathématiques"
                className="text-sm"
              />
              <p className="text-xs text-orange-600 mt-1">
                Précisez le code ou le nom de l'examen pour lequel vous devez obligatoirement surveiller.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
