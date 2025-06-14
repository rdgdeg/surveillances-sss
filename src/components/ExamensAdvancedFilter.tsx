
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExamenGroupe } from "@/utils/examenReviewUtils";

interface ExamensAdvancedFilterProps {
  examens: ExamenGroupe[];
  onBulkAssignFaculty: (groupeKeys: string[], faculty: string) => void;
  setFilter: (pattern: string, type: "contain" | "prefix" | "suffix") => void;
  facultyOptions?: string[];
}

export const ExamensAdvancedFilter = ({
  examens,
  onBulkAssignFaculty,
  setFilter,
  facultyOptions = ["MEDE", "FASB", "FSM", "FSP", "INCONNU"],
}: ExamensAdvancedFilterProps) => {
  const [pattern, setPattern] = useState('');
  const [filterType, setFilterType] = useState<"contain" | "prefix" | "suffix">("contain");
  const [bulkFaculty, setBulkFaculty] = useState('');
  const [selectedGroupeKeys, setSelectedGroupeKeys] = useState<string[]>([]);

  // Filter groupes selon pattern & type choisi
  const filteredGroupes = examens.filter((groupe) => {
    if (!pattern) return false;
    if (filterType === "prefix") {
      return groupe.code_examen?.toLowerCase().startsWith(pattern.toLowerCase());
    } else if (filterType === "suffix") {
      return groupe.code_examen?.toLowerCase().endsWith(pattern.toLowerCase());
    } else {
      return groupe.code_examen?.toLowerCase().includes(pattern.toLowerCase());
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedGroupeKeys([]);
    } else {
      setSelectedGroupeKeys(filteredGroupes.map(
        (g) => `${g.code_examen}-${g.date_examen}-${g.heure_debut}-${g.auditoire_unifie}`
      ));
    }
  };

  const handleBulkAssign = () => {
    if (selectedGroupeKeys.length && bulkFaculty) {
      onBulkAssignFaculty(selectedGroupeKeys, bulkFaculty);
      setBulkFaculty('');
      setSelectedGroupeKeys([]);
    }
  };

  return (
    <div className="space-y-3 py-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          value={pattern}
          placeholder="Filtrer par pattern de code examen"
          onChange={e => setPattern(e.target.value)}
          className="w-52"
        />
        <Select value={filterType} onValueChange={(val) => setFilterType(val as any)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type de filtre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contient</SelectItem>
            <SelectItem value="prefix">Commence par</SelectItem>
            <SelectItem value="suffix">Finit par</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline"
          onClick={() => setFilter(pattern, filterType)}
        >Voir</Button>
      </div>
      {pattern && (
        <div className="p-3 rounded bg-gray-50 border">
          <div className="mb-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedGroupeKeys.length === filteredGroupes.length && filteredGroupes.length > 0}
              onChange={e => handleSelectAll(e.target.checked)}
            />
            <span className="text-sm">
              {filteredGroupes.length} groupe{filteredGroupes.length > 1 ? 's' : ''} filtré{filteredGroupes.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {filteredGroupes.map((g, idx) => {
              const key = `${g.code_examen}-${g.date_examen}-${g.heure_debut}-${g.auditoire_unifie}`;
              return (
                <label key={key} className="flex items-center gap-2 border rounded p-1 px-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGroupeKeys.includes(key)}
                    onChange={e => {
                      setSelectedGroupeKeys(prev =>
                        e.target.checked ? [...prev, key] : prev.filter(k => k !== key)
                      );
                    }}
                  />
                  <Badge variant="secondary">{g.code_examen}</Badge>{' '}
                  <span>{g.matiere}</span> <span className="text-gray-500">({g.auditoire_unifie})</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 items-center">
            <Select value={bulkFaculty} onValueChange={v => setBulkFaculty(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assigner la faculté..." />
              </SelectTrigger>
              <SelectContent>
                {facultyOptions.map(f => (
                  <SelectItem value={f} key={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleBulkAssign} 
              disabled={!selectedGroupeKeys.length || !bulkFaculty}
            >
              Assigner la faculté
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
