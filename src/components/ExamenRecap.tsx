
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";

type ExamenRecapProps = {
  selectedExamen: any;
  formatDate: (dateStr: string) => string;
};

export function ExamenRecap({ selectedExamen, formatDate }: ExamenRecapProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-bold">{selectedExamen.code_examen}</span>
          <span className="ml-3">{selectedExamen.matiere}</span>
        </div>
        <Badge variant={selectedExamen.besoins_confirmes_par_enseignant ? "default" : "secondary"}>
          {selectedExamen.besoins_confirmes_par_enseignant ? "Confirmé" : "En attente"}
        </Badge>
      </div>
      <div className="space-y-1 text-sm pt-2">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(selectedExamen.date_examen)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{selectedExamen.heure_debut} - {selectedExamen.heure_fin}</span>
        </div>
        <div className="flex items-center space-x-1">
          <MapPin className="h-3 w-3" />
          <span>{selectedExamen.salle}</span>
        </div>
      </div>
    </>
  );
}
