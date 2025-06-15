import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuiviConfirmationFiltersProps {
  examens: any[];
  onFilterChange: (filters: {
    searchTerm: string;
    sortBy: string;
    statusFilter: string;
    selectedExamen: any | null;
  }) => void;
}

export function SuiviConfirmationFilters({ examens, onFilterChange }: SuiviConfirmationFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedExamen, setSelectedExamen] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const handleFilterUpdate = (updates: Partial<{ searchTerm: string; sortBy: string; statusFilter: string; selectedExamen: any | null; }>) => {
    const filters = {
      searchTerm,
      sortBy,
      statusFilter,
      selectedExamen,
      ...updates
    };
    onFilterChange(filters);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    handleFilterUpdate({ searchTerm: value });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    handleFilterUpdate({ sortBy: value });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    handleFilterUpdate({ statusFilter: value });
  };

  const handleExamenSelect = (examen: any) => {
    setSelectedExamen(examen);
    setOpen(false);
    handleFilterUpdate({ selectedExamen: examen });
  };

  const clearExamenFilter = () => {
    setSelectedExamen(null);
    handleFilterUpdate({ selectedExamen: null });
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Recherche par texte */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par code, matière, enseignant..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Autocomplétion examen */}
        <div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedExamen
                  ? `${selectedExamen.code_examen} - ${selectedExamen.matiere}`
                  : "Sélectionner un examen..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandInput placeholder="Rechercher un examen..." />
                <CommandList>
                  <CommandEmpty>Aucun examen trouvé.</CommandEmpty>
                  <CommandGroup>
                    {examens.map((examen) => (
                      <CommandItem
                        key={examen.id}
                        value={`${examen.code_examen} ${examen.matiere} ${examen.enseignant_nom || examen.enseignants || ''}`}
                        onSelect={() => handleExamenSelect(examen)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedExamen?.id === examen.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{examen.code_examen}</span>
                          <span className="text-sm text-gray-500">{examen.matiere}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedExamen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearExamenFilter}
              className="mt-1 h-6 px-2 text-xs"
            >
              Effacer
            </Button>
          )}
        </div>

        {/* Tri */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Trier par date</SelectItem>
            <SelectItem value="code">Trier par code</SelectItem>
            <SelectItem value="matiere">Trier par matière</SelectItem>
            <SelectItem value="enseignant">Trier par enseignant</SelectItem>
            <SelectItem value="status">Trier par statut</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtre statut */}
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="confirmed">Confirmés</SelectItem>
            <SelectItem value="completed">Informations fournies</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
