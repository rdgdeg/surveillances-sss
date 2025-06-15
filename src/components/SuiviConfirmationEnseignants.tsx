
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SuiviConfirmationEnseignants() {
  // Récupère tous les examens avec infos présence enseignant, personnes amenées, confirmation besoins
  const { data: examens, isLoading } = useQuery({
    queryKey: ["examens-admin-suivi-confirm", "enseignants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examens")
        .select("id, code_examen, matiere, salle, date_examen, surveillants_enseignant, surveillants_amenes, besoins_confirmes_par_enseignant, enseignant_nom, enseignant_email")
        .order("date_examen")
        .order("heure_debut");
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="mx-auto max-w-7xl">
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
                <TableHead>Personnes amenées</TableHead>
                <TableHead>Besoins confirmés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && examens && examens.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell>{ex.code_examen || ""}</TableCell>
                  <TableCell>{ex.matiere || ""}</TableCell>
                  <TableCell>{ex.date_examen || ""}</TableCell>
                  <TableCell>{ex.salle || ""}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{ex.enseignant_nom || "?"}</span>
                      <div className="text-xs text-gray-400">{ex.enseignant_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ex.surveillants_enseignant > 0 ? (
                      <Badge variant="success">Présent</Badge>
                    ) : (
                      <Badge variant="destructive">Absent</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{ex.surveillants_amenes ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    {ex.besoins_confirmes_par_enseignant ? (
                      <Badge variant="success">Confirmé</Badge>
                    ) : (
                      <Badge variant="outline">En attente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400">Chargement…</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
