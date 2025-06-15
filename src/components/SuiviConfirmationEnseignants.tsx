
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SuiviConfirmationStats } from "./SuiviConfirmationStats";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { useContraintesAuditoires } from "@/hooks/useContraintesAuditoires";

export function SuiviConfirmationEnseignants() {
  const { data: contraintesAuditoires } = useContraintesAuditoires();

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

  return (
    <div className="mx-auto max-w-7xl">
      {examens && <SuiviConfirmationStats examens={examens} />}
      
      <Card>
        <CardHeader>
          <CardTitle>Suivi confirmation enseignants (présence & informations apportées)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Auditoire</TableHead>
                <TableHead>Enseignant</TableHead>
                <TableHead>Présent</TableHead>
                <TableHead>Personnes présentes</TableHead>
                <TableHead>Surveillants</TableHead>
                <TableHead>Besoins confirmés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && examens && examens.map((ex: any) => {
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
                      <div>
                        <span className="font-medium">
                          {ex.enseignant_nom || ex.enseignants || "?"}
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
                        <Badge variant="secondary">Complété</Badge>
                      ) : (
                        <Badge variant="outline">En attente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-400">Chargement…</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
