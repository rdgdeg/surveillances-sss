import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SuiviConfirmationStats } from "./SuiviConfirmationStats";
import { SuiviConfirmationFilters } from "./SuiviConfirmationFilters";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";
import { EnseignantInfosEditModal } from "./EnseignantInfosEditModal";
import { Button } from "@/components/ui/button";

export function SuiviConfirmationEnseignants() {
  const { data: contraintesAuditoires } = useContraintesAuditoires();
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortBy: "date",
    statusFilter: "all",
    selectedExamen: null as any
  });

  // Récupère tous les examens avec infos présence enseignant, personnes amenées, confirmation besoins
  const { data: examens, isLoading } = useQuery({
    queryKey: ["examens-admin-suivi-confirm", "enseignants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens")
        .select("id, code_examen, matiere, salle, date_examen, heure_debut, heure_fin, surveillants_enseignant, surveillants_amenes, besoins_confirmes_par_enseignant, enseignant_nom, enseignant_email, enseignants, nombre_surveillants")
        .order("date_examen")
        .order("heure_debut");
      if (error) throw error;
      return data || [];
    }
  });

  // Fonction pour calculer les surveillants nécessaires selon contraintes
  const calculerSurveillantsNecessaires = (examen: any) => {
    if (!contraintesAuditoires || !examen.salle) return examen.nombre_surveillants || 1;
    
    const auditoireList = examen.salle
      .split(",")
      .map((a: string) => a.trim().toLowerCase())
      .filter((a: string) => !!a);

    let total = 0;
    let fallback = 0;

    auditoireList.forEach((auditoire: string) => {
      const individual = contraintesAuditoires[auditoire];
      if (individual !== undefined) {
        total += individual;
      } else {
        fallback += 1;
      }
    });

    return total === 0 ? examen.nombre_surveillants || 1 : total + fallback;
  };

  // Fonction pour calculer les surveillants adaptés
  const calculerSurveillantsAdaptes = (examen: any) => {
    const theoriques = calculerSurveillantsNecessaires(examen);
    const enseignantPresent = examen.surveillants_enseignant || 0;
    const personnesAmenees = examen.surveillants_amenes || 0;
    return Math.max(0, theoriques - enseignantPresent - personnesAmenees);
  };

  // Fonction pour filtrer et trier les examens
  const getFilteredAndSortedExamens = () => {
    if (!examens) return [];

    let filtered = examens;

    // Filtre par examen sélectionné
    if (filters.selectedExamen) {
      filtered = filtered.filter(ex => ex.id === filters.selectedExamen.id);
    }

    // Filtre par terme de recherche
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(ex => 
        (ex.code_examen || "").toLowerCase().includes(term) ||
        (ex.matiere || "").toLowerCase().includes(term) ||
        (ex.enseignant_nom || "").toLowerCase().includes(term) ||
        (ex.enseignants || "").toLowerCase().includes(term) ||
        (ex.enseignant_email || "").toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (filters.statusFilter !== "all") {
      filtered = filtered.filter(ex => {
        switch (filters.statusFilter) {
          case "confirmed":
            return ex.besoins_confirmes_par_enseignant;
          case "completed":
            return (ex.surveillants_enseignant !== null || ex.surveillants_amenes > 0) && !ex.besoins_confirmes_par_enseignant;
          case "pending":
            return ex.surveillants_enseignant === null && ex.surveillants_amenes === 0;
          default:
            return true;
        }
      });
    }

    // Tri
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "code":
          return (a.code_examen || "").localeCompare(b.code_examen || "");
        case "matiere":
          return (a.matiere || "").localeCompare(b.matiere || "");
        case "enseignant":
          const nameA = a.enseignant_nom || a.enseignants || "";
          const nameB = b.enseignant_nom || b.enseignants || "";
          return nameA.localeCompare(nameB);
        case "status":
          const statusA = a.besoins_confirmes_par_enseignant ? "confirmed" : 
                         (a.surveillants_enseignant !== null || a.surveillants_amenes > 0) ? "completed" : "pending";
          const statusB = b.besoins_confirmes_par_enseignant ? "confirmed" : 
                         (b.surveillants_enseignant !== null || b.surveillants_amenes > 0) ? "completed" : "pending";
          return statusA.localeCompare(statusB);
        case "date":
        default:
          const dateA = new Date(a.date_examen + " " + a.heure_debut);
          const dateB = new Date(b.date_examen + " " + b.heure_debut);
          return dateA.getTime() - dateB.getTime();
      }
    });

    return filtered;
  };

  const [modalEdit, setModalEdit] = useState<{ open: boolean, examen: any | null }>({ open: false, examen: null });

  const filteredExamens = getFilteredAndSortedExamens();

  return (
    <div className="mx-auto max-w-7xl">
      {examens && <SuiviConfirmationStats examens={examens} />}
      
      <Card>
        <CardHeader>
          <CardTitle>Suivi confirmation enseignants (présence & informations apportées)</CardTitle>
        </CardHeader>
        <CardContent>
          <SuiviConfirmationFilters 
            examens={examens || []}
            onFilterChange={setFilters}
          />
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Auditoire</TableHead>
                <TableHead>Enseignant(s) du cours</TableHead>
                <TableHead>Enseignant présent pour l&apos;examen</TableHead>
                <TableHead>Présent</TableHead>
                <TableHead>Personnes présentes</TableHead>
                <TableHead>Surveillants</TableHead>
                <TableHead>Besoins confirmés</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredExamens.map((ex: any) => {
                const surveillantsNecessaires = calculerSurveillantsNecessaires(ex);
                const surveillantsAdaptes = calculerSurveillantsAdaptes(ex);
                
                return (
                  <TableRow key={ex.id}>
                    <TableCell className="font-mono text-sm">{ex.code_examen || ""}</TableCell>
                    <TableCell>{ex.matiere || ""}</TableCell>
                    <TableCell>
                      {ex.date_examen ? formatDateWithDayBelgian(ex.date_examen) : ""}
                      {ex.heure_debut && (
                        <div className="text-xs text-gray-500">
                          {ex.heure_debut} - {ex.heure_fin}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{ex.salle || ""}</TableCell>
                    <TableCell>
                      {ex.enseignants && ex.enseignants.trim()
                        ? ex.enseignants
                        : <span className="text-gray-400">–</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {ex.enseignant_nom && ex.enseignant_nom.trim()
                            ? ex.enseignant_nom
                            : <span className="text-gray-400">Non renseigné</span>
                          }
                        </span>
                        {ex.enseignant_email && (
                          <div className="text-xs text-gray-400">{ex.enseignant_email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ex.surveillants_enseignant > 0 ? (
                        <Badge variant="default">Présent</Badge>
                      ) : ex.surveillants_enseignant === 0 ? (
                        <Badge variant="destructive">Absent</Badge>
                      ) : (
                        <Badge variant="outline">Non renseigné</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ex.surveillants_amenes ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {surveillantsNecessaires} → {surveillantsAdaptes}
                        </div>
                        <div className="text-xs text-gray-500">
                          Nécessaires → Adaptés
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ex.besoins_confirmes_par_enseignant ? (
                        <Badge variant="default">Confirmé</Badge>
                      ) : (ex.surveillants_enseignant !== null || ex.surveillants_amenes > 0) ? (
                        <Badge variant="secondary">Partiel</Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalEdit({ open: true, examen: ex })}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-gray-400">Chargement…</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredExamens.length === 0 && examens && examens.length > 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-gray-400">Aucun examen ne correspond aux critères de recherche.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modalEdit.open && modalEdit.examen && (
        <EnseignantInfosEditModal
          examen={modalEdit.examen}
          open={modalEdit.open}
          onClose={() => setModalEdit({ open: false, examen: null })}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
