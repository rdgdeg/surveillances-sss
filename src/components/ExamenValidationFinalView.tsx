
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function ExamenValidationFinalView() {
  const { data: activeSession } = useActiveSession();

  // Récupérer les examens validés
  const { data: examensValides = [], isLoading: isLoadingExamens } = useQuery({
    queryKey: ["examens-valides", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from("examens")
        .select("*")
        .eq("session_id", activeSession.id)
        .eq("statut_validation", "VALIDE")
        .order("date_examen")
        .order("heure_debut");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id,
  });

  // Récupérer les créneaux de surveillance générés
  const { data: creneauxSurveillance = [], isLoading: isLoadingCreneaux } = useQuery({
    queryKey: ["creneaux-surveillance", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from("creneaux_surveillance")
        .select(`
          *,
          examens!inner(
            session_id,
            code_examen,
            matiere,
            salle
          )
        `)
        .eq("examens.session_id", activeSession.id)
        .order("date_surveillance")
        .order("heure_debut_surveillance");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id,
  });

  // Statistiques
  const stats = {
    totalExamens: examensValides.length,
    totalCreneaux: creneauxSurveillance.length,
    joursUniques: new Set(examensValides.map(e => e.date_examen)).size,
    sallesUniques: new Set(examensValides.map(e => e.salle)).size,
  };

  if (isLoadingExamens || isLoadingCreneaux) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des données de validation...</p>
        </CardContent>
      </Card>
    );
  }

  if (examensValides.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-gray-400" />
            <span>Validation Finale</span>
          </CardTitle>
          <CardDescription>
            Aucun examen validé pour le moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Les examens apparaîtront ici une fois qu'ils auront été validés dans l'étape précédente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques de validation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalExamens}</p>
                <p className="text-xs text-gray-600">Examens validés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCreneaux}</p>
                <p className="text-xs text-gray-600">Créneaux générés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.joursUniques}</p>
                <p className="text-xs text-gray-600">Jours d'examen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sallesUniques}</p>
                <p className="text-xs text-gray-600">Salles utilisées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des examens validés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Examens Validés</span>
          </CardTitle>
          <CardDescription>
            Liste définitive des examens créés et prêts pour attribution des surveillants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Faculté</TableHead>
                  <TableHead>Surveillants</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examensValides.map((examen) => (
                  <TableRow key={examen.id}>
                    <TableCell className="font-mono text-sm">
                      {examen.code_examen}
                    </TableCell>
                    <TableCell className="font-medium">
                      {examen.matiere}
                    </TableCell>
                    <TableCell>
                      {format(new Date(examen.date_examen), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {examen.heure_debut} - {examen.heure_fin}
                    </TableCell>
                    <TableCell>
                      {examen.salle}
                    </TableCell>
                    <TableCell>
                      {examen.faculte}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Requis: {examen.nombre_surveillants}</div>
                        <div className="text-gray-500">
                          À attribuer: {examen.surveillants_a_attribuer || examen.nombre_surveillants}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Validé
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Créneaux de surveillance générés */}
      {creneauxSurveillance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Créneaux de Surveillance Générés</span>
            </CardTitle>
            <CardDescription>
              Créneaux automatiquement générés pour la collecte des disponibilités.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Créneau</TableHead>
                    <TableHead>Examen(s)</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creneauxSurveillance.map((creneau) => (
                    <TableRow key={creneau.id}>
                      <TableCell>
                        {format(new Date(creneau.date_surveillance), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {creneau.heure_debut_surveillance} - {creneau.heure_fin_surveillance}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{creneau.examens?.code_examen}</div>
                          <div className="text-sm text-gray-600">{creneau.examens?.matiere}</div>
                          <div className="text-xs text-gray-500">{creneau.examens?.salle}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {creneau.type_creneau}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
