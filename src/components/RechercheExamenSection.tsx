
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListFilter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import React from "react";

type RechercheExamenSectionProps = {
  searchCode: string;
  setSearchCode: (s: string) => void;
  examenTrouve: any;
  setSelectedExamen: (e: any) => void;
  filteredExamens: any[];
  faculteFilter: string;
  setFaculteFilter: (f: string) => void;
  dateFilter: Date | null;
  setDateFilter: (date: Date | null) => void;
  faculteList: string[];
  selectedExamen: any;
};

export function RechercheExamenSection({
  searchCode,
  setSearchCode,
  examenTrouve,
  setSelectedExamen,
  filteredExamens,
  faculteFilter,
  setFaculteFilter,
  dateFilter,
  setDateFilter,
  faculteList,
  selectedExamen
}: RechercheExamenSectionProps) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:space-x-2 space-y-2 md:space-y-0">
        <Input
          placeholder="Code d'examen..."
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => setSelectedExamen(examenTrouve)} disabled={!examenTrouve}>
          Rechercher
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center">
              <ListFilter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="space-y-4">
              <div>
                <Label>Faculté</Label>
                <Select value={faculteFilter} onValueChange={setFaculteFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les facultés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes</SelectItem>
                    {faculteList.map((fac) => (
                      <SelectItem value={fac} key={fac}>
                        {fac}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <ShadcnCalendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  className="pointer-events-auto"
                />
                {dateFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateFilter(null)}
                    className="mt-1"
                  >
                    Effacer la date
                  </Button>
                )}
              </div>
              {(faculteFilter || dateFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFaculteFilter("");
                    setDateFilter(null);
                  }}
                  className="w-full"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {searchCode && !examenTrouve && (
        <p className="text-sm text-red-600">Aucun examen trouvé avec ce code.</p>
      )}

      <div className="py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Matière</TableHead>
              <TableHead>Faculté</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Salle</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExamens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Aucun examen correspondant</TableCell>
              </TableRow>
            ) : (
              filteredExamens.map((ex: any) => (
                <TableRow key={ex.id} className={selectedExamen && ex.id === selectedExamen.id ? "bg-blue-100/50" : ""}>
                  <TableCell className="font-mono">{ex.code_examen}</TableCell>
                  <TableCell>{ex.matiere}</TableCell>
                  <TableCell>{ex.faculte}</TableCell>
                  <TableCell>{formatDate(ex.date_examen)}</TableCell>
                  <TableCell>{ex.salle}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm"
                      variant={selectedExamen && ex.id === selectedExamen.id ? "secondary" : "outline"}
                      onClick={() => setSelectedExamen(ex)}
                    >
                      {selectedExamen && ex.id === selectedExamen.id ? "Sélectionné" : "Choisir"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="text-sm text-gray-600 mt-2">
          {filteredExamens.length} examen{filteredExamens.length > 1 ? "s" : ""} affiché{filteredExamens.length > 1 ? "s" : ""}
        </div>
      </div>
    </>
  )
}
