
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Fonction pour formater la date et calculer l'heure de début de surveillance
function formatExamSlotForDisplay(date_examen: string, heure_debut: string, heure_fin: string) {
  const date = new Date(`${date_examen}T${heure_debut}`);
  const jour = String(date.getDate()).padStart(2, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const annee = date.getFullYear();
  const formattedDate = `${jour}-${mois}-${annee}`;

  // Calcul heure début surveillance (45 min avant heure_debut)
  const [hdHour, hdMin] = heure_debut.split(":").map(Number);
  const debutSurv = new Date(date);
  debutSurv.setHours(hdHour);
  debutSurv.setMinutes(hdMin - 45);
  if (debutSurv.getMinutes() < 0) {
    debutSurv.setHours(debutSurv.getHours() - 1);
    debutSurv.setMinutes(debutSurv.getMinutes() + 60);
  }
  const dh = String(debutSurv.getHours()).padStart(2, "0");
  const dm = String(debutSurv.getMinutes()).padStart(2, "0");
  const startSurv = `${dh}:${dm}`;

  return {
    formattedDate,
    debutSurv: startSurv,
    heure_fin
  };
}

export function CreneauRow({
  creneauKey,
  creneau,
  value,
  onDisponibleChange,
  onTypeChange,
  onNomExamenChange
}) {
  const { formattedDate, debutSurv, heure_fin } = formatExamSlotForDisplay(
    creneau.date_examen, 
    creneau.heure_debut, 
    creneau.heure_fin
  );

  return (
    <div className="border p-4 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={!!value.dispo}
          onCheckedChange={val => onDisponibleChange(creneauKey, !!val)}
          className="mt-1"
        />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2 flex-wrap">
            <Badge variant="outline">{formattedDate}</Badge>
            <Badge variant="outline">
              Surveillance: {debutSurv} - {heure_fin}
            </Badge>
            <span className="text-xs text-gray-500">
              (Examen: {creneau.heure_debut} - {creneau.heure_fin})
            </span>
          </div>
          
          {value.dispo && (
            <div className="bg-blue-50 p-3 rounded-md space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={value.type_choix === 'obligatoire'}
                  onCheckedChange={val => onTypeChange(creneauKey, val ? 'obligatoire' : 'souhaitee')}
                />
                <span className="text-sm font-medium">
                  {value.type_choix === 'obligatoire' ? 
                    <Badge variant="destructive">Surveillance obligatoire</Badge> : 
                    <Badge variant="secondary">Surveillance souhaitée</Badge>
                  }
                </span>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom ou code de l'examen (optionnel)
                </label>
                <Input
                  placeholder="Ex: MATH1101, Analyse..."
                  value={value.nom_examen_selectionne || ""}
                  onChange={e => onNomExamenChange(creneauKey, e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
