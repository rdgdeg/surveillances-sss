
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SuiviConfirmationStats } from "./SuiviConfirmationStats";
import { SuiviConfirmationFilters } from "./SuiviConfirmationFilters";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { useCalculSurveillants } from "@/hooks/useCalculSurveillants";
import { EnseignantInfosEditModal } from "./EnseignantInfosEditModal";
import { Button } from "@/components/ui/button";

export function SuiviConfirmationEnseignants() {
  // Utiliser le hook centralisé pour les calculs harmonisés
  const { 
    calculerSurveillantsTheorique, 
    calculerSurveillantsNecessaires 
  } = useCalculSurveillants();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    sortBy: "date",
    statusFilter: "all",
    selectedExamen: null as any
  });

  // Récupère tous les examens avec toutes les informations possibles d'enseignants
  const { data: examens, isLoading } = useQuery({
    queryKey: ["examens-admin-suivi-confirm", "enseignants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens")
        .select(`
          *,
          personnes_aidantes (*)
        `)
        .order("date_examen")
        .order("heure_debut");
      if (error) throw error;
      
      console.log("Examens récupérés - aperçu des champs enseignants:", data?.slice(0, 3).map(ex => ({
        id: ex.id,
        code_examen: ex.code_examen,
        enseignants: ex.enseignants,
        enseignant_nom: ex.enseignant_nom
      })));
      
      return data || [];
    }
  });

  // Fonction pour extraire le nom d'enseignant depuis le champ enseignants importé
  const getEnseignantsDuCours = (examen: any) => {
    // Le champ enseignants contient les données importées du fichier Excel
    if (examen.enseignants && typeof examen.enseignants === 'string' && examen.enseignants.trim()) {
      return examen.enseignants.trim();
    }
    return null;
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
        (getEnseignantsDuCours(ex) || "").toLowerCase().includes(term) ||
        (ex.enseignant_nom || "").toLowerCase().includes(term) ||
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
          const nameA = getEnseignantsDuCours(a) || "";
          const nameB = getEnseignantsDuCours(b) || "";
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
                <TableHead>Enseignant présent confirmé</TableHead>
                <TableHead>Présent</TableHead>
                <TableHead>Personnes présentes</TableHead>
                <TableHead>Surveillants</TableHead>
                <TableHead>Besoins confirmés</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filteredExamens.map((ex: any) => {
                // Utiliser les calculs harmonisés centralisés
                const surveillantsTheorique = calculerSurveillantsTheorique(ex);
                const surveillantsNecessaires = calculerSurveillantsNecessaires(ex);
                const enseignantsDuCours = getEnseignantsDuCours(ex);
                
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
                      {enseignantsDuCours ? (
                        <div>
                          <span className="font-medium text-blue-700">{enseignantsDuCours}</span>
                          <div className="text-xs text-gray-500">Enseignant du cours</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
                        {ex.enseignant_nom && ex.enseignant_nom.trim() && (
                          <div className="text-xs text-gray-500">Confirmé présent</div>
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
                          {surveillantsTheorique} → {surveillantsNecessaires}
                        </div>
                        <div className="text-xs text-gray-500">
                          Théoriques → Adaptés
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {surveillantsTheorique} - {ex.surveillants_enseignant || 0} - {ex.surveillants_amenes || 0} - {ex.surveillants_pre_assignes || 0} = {surveillantsNecessaires}
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
