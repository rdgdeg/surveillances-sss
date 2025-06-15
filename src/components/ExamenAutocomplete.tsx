
import { useState, useMemo } from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamenAutocompleteProps {
  examens: any[];
  selectedExamen: any | null;
  onSelectExamen: (examen: any) => void;
  placeholder?: string;
}

export const ExamenAutocomplete = ({ examens, selectedExamen, onSelectExamen, placeholder = "Rechercher un examen..." }: ExamenAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredExamens = useMemo(() => {
    if (!search) return examens.slice(0, 10); // Limiter à 10 résultats si pas de recherche
    
    return examens.filter((examen) => {
      const searchTerm = search.toLowerCase();
      return (
        examen.code_examen?.toLowerCase().includes(searchTerm) ||
        examen.matiere?.toLowerCase().includes(searchTerm) ||
        examen.salle?.toLowerCase().includes(searchTerm)
      );
    }).slice(0, 10); // Limiter à 10 résultats
  }, [examens, search]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedExamen ? (
            <span className="truncate">
              {selectedExamen.code_examen} - {selectedExamen.matiere}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Tapez le code, matière ou salle..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Aucun examen trouvé.</CommandEmpty>
            <CommandGroup>
              {filteredExamens.map((examen) => (
                <CommandItem
                  key={examen.id}
                  value={`${examen.code_examen} ${examen.matiere} ${examen.salle}`}
                  onSelect={() => {
                    onSelectExamen(examen);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {examen.code_examen}
                    </div>
                    <div className="text-sm text-gray-600 truncate max-w-[250px]">
                      {examen.matiere}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(examen.date_examen)} • {examen.salle}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      selectedExamen?.id === examen.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
