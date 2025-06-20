
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, Clock, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getTheoreticalSurveillants, calculerSurveillantsPedagogiques, calculerSurveillantsNecessaires } from "@/hooks/useExamenManagement";
import { useContraintesAuditoiresMap } from "@/hooks/useContraintesAuditoires";

export function ExamenValidationFinalView() {
  const { data: activeSession } = useActiveSession();
  const { data: contraintesMap } = useContraintesAuditoiresMap();

  // Récupérer les examens validés avec leurs équipes pédagogiques
  const { data: examensValides = [], isLoading: isLoadingExamens } = useQuery({
    queryKey: ["examens-valides", activeSession?.id, contraintesMap],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from("examens")
        .select(`
          *,
          personnes_aidantes (*)
        `)
        .eq("session_id", activeSession.id)
        .eq("statut_validation", "VALIDE")
        .order("date_examen")
        .order("heure_debut");
      if (error) throw error;
      
      // Enrichir avec les calculs harmonisés
      return (data || []).map(examen => {
        const surveillantsTheorique = getTheoreticalSurveillants(examen, contraintesMap);
        const surveillantsPedagogiques = calculerSurveillantsPedagogiques(examen);
        const surveillantsNecessaires = calculerSurveillantsNecessaires(examen, contraintesMap);
        
        return {
          ...examen,
          surveillants_theorique: surveillantsTheorique,
          surveillants_pedagogiques: surveillantsPedagogiques,
          surveillants_necessaires: surveillantsNecessaires
        };
      });
    },
    enabled: !!activeSession?.id && !!contraintesMap,
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

      {/* Liste des examens validés avec calculs détaillés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Examens Validés</span>
          </CardTitle>
          <CardDescription>
            Liste définitive des examens avec détail des besoins en surveillance (calculs harmonisés sans double comptage).
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
                  <TableHead className="text-center">Théoriques</TableHead>
                  <TableHead className="text-center">Prof + Apportés</TableHead>
                  <TableHead className="text-center">Pédagogiques</TableHead>
                  <TableHead className="text-center">Pré-assignés</TableHead>
                  <TableHead className="text-center">Besoin Réel</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examensValides.map((examen) => {
                  const profApportes = (examen.surveillants_enseignant || 0) + (examen.surveillants_amenes || 0);
                  
                  return (
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
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-800">
                          {examen.surveillants_theorique}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {profApportes > 0 ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-green-50 text-green-800">
                              {profApportes}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              Prof: {examen.surveillants_enseignant || 0} + 
                              Amenés: {examen.surveillants_amenes || 0}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-800">
                          {examen.surveillants_pedagogiques}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          (hors prof)
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-orange-50 text-orange-800">
                          {examen.surveillants_pre_assignes || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="default" 
                          className={`${
                            examen.surveillants_necessaires > 0 
                              ? "bg-red-100 text-red-800" 
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {examen.surveillants_necessaires}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Validé
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
