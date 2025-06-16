
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
      <CommandList className="max-h-[500px]">
        <CommandEmpty>Aucun examen trouvé.</CommandEmpty>
        <CommandGroup>
          {filteredExamens.slice(0, 20).map((examen) => (
            <CommandItem
              key={examen.id}
              onSelect={() => {
                onSelectExamen(examen);
                setOpen(false);
                setValue("");
              }}
              className="flex flex-col items-start p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {examen.code_examen || 'Sans code'}
                  </Badge>
                  <span className="font-medium text-base">{examen.matiere}</span>
                </div>
                <Badge variant={examen.besoins_confirmes_par_enseignant ? "default" : "secondary"}>
                  {examen.besoins_confirmes_par_enseignant ? "Confirmé" : "En attente"}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 w-full">
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
                  <span className="truncate max-w-[150px]">{examen.salle}</span>
                </div>
                {examen.enseignant_nom && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="font-medium text-blue-600 truncate max-w-[120px]">
                      {examen.enseignant_nom}
                    </span>
                  </div>
                )}
              </div>
              
              {filteredExamens.length > 15 && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  {filteredExamens.length - 15} autres résultats disponibles
                </div>
              )}
            </CommandItem>
          ))}
          
          {filteredExamens.length > 20 && (
            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
              Affichage de 20 résultats sur {filteredExamens.length}. 
              Affinez votre recherche pour voir plus de résultats.
            </div>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
