
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function CreneauRow({
  creneauKey,
  creneau,
  value,
  onDisponibleChange,
  onTypeChange,
  onNomExamenChange
}) {
  return (
    <div className="flex items-center space-x-2 border p-2 rounded">
      <Checkbox
        checked={!!value.dispo}
        onCheckedChange={val => onDisponibleChange(creneauKey, !!val)}
      />
      <span>
        {creneau.date_examen} • {creneau.heure_debut} - {creneau.heure_fin}
      </span>
      {value.dispo && (
        <div className="flex items-center space-x-2 ml-4">
          <Checkbox
            checked={value.type_choix === 'obligatoire'}
            onCheckedChange={val => onTypeChange(creneauKey, val ? 'obligatoire' : 'souhaitee')}
          />
          <span className="text-xs">
            {value.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaitée'}
          </span>
          <Input
            className="ml-2 min-w-[140px]"
            placeholder="Nom (ou code) examen"
            value={value.nom_examen_selectionne || ""}
            onChange={e => onNomExamenChange(creneauKey, e.target.value)}
            size={10}
          />
        </div>
      )}
    </div>
  );
}
