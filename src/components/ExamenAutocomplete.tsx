
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User } from "lucide-react";

interface ExamenAutocompleteProps {
  examens: any[];
  selectedExamen: any;
  onSelectExamen: (examen: any) => void;
  placeholder?: string;
}

export const ExamenAutocomplete = ({
  examens,
  selectedExamen,
  onSelectExamen,
  placeholder = "Rechercher un examen..."
}: ExamenAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const filteredExamens = examens.filter(examen =>
    examen.matiere?.toLowerCase().includes(value.toLowerCase()) ||
    examen.code_examen?.toLowerCase().includes(value.toLowerCase()) ||
    examen.salle?.toLowerCase().includes(value.toLowerCase()) ||
    examen.enseignant_nom?.toLowerCase().includes(value.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput
        placeholder={placeholder}
        value={value}
        onValueChange={setValue}
      />
      <CommandList>
        <CommandEmpty>Aucun examen trouvé.</CommandEmpty>
        <CommandGroup>
          {filteredExamens.map((examen) => (
            <CommandItem
              key={examen.id}
              onSelect={() => {
                onSelectExamen(examen);
                setOpen(false);
                setValue("");
              }}
              className="flex flex-col items-start p-4 cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{examen.code_examen || 'Sans code'}</Badge>
                  <span className="font-medium">{examen.matiere}</span>
                </div>
                <Badge variant={examen.besoins_confirmes_par_enseignant ? "default" : "secondary"}>
                  {examen.besoins_confirmes_par_enseignant ? "Confirmé" : "En attente"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(examen.date_examen)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{examen.heure_debut} - {examen.heure_fin}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{examen.salle}</span>
                </div>
                {examen.enseignant_nom && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="font-medium text-blue-600">{examen.enseignant_nom}</span>
                  </div>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
