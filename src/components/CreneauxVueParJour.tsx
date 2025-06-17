
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Trash2, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface CreneauWithExamens {
  id: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string | null;
  is_validated: boolean;
  examens: Array<{
    id: string;
    matiere: string;
    code_examen: string;
    heure_debut: string;
    heure_fin: string;
    salle: string;
  }>;
}

interface JourCreneaux {
  date: string;
  creneaux: CreneauWithExamens[];
  totalExamens: number;
}

export const CreneauxVueParJour = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Récupérer les créneaux validés avec leurs examens
  const { data: creneauxParJour = [], isLoading } = useQuery({
    queryKey: ['creneaux-vue-par-jour', activeSession?.id],
    queryFn: async (): Promise<JourCreneaux[]> => {
      if (!activeSession?.id) return [];

      // D'abord récupérer tous les examens validés
      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, code_examen, salle')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen')
        .order('heure_debut');

      if (examensError) throw examensError;

      // Récupérer les créneaux validés
      const { data: creneaux, error: creneauxError } = await supabase
        .from('creneaux_surveillance_config')
        .select('id, heure_debut, heure_fin, nom_creneau, is_validated')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');

      if (creneauxError) throw creneauxError;

      // Fonction pour vérifier si un examen est couvert par un créneau
      const verifierCouverture = (examen: any, creneau: any): boolean => {
        const toMinutes = (time: string) => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };

        const creneauDebutMin = toMinutes(creneau.heure_debut);
        const creneauFinMin = toMinutes(creneau.heure_fin);
        const examDebutMin = toMinutes(examen.heure_debut);
        const examFinMin = toMinutes(examen.heure_fin);

        const debutSurveillanceMin = examDebutMin - 45;
        return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
      };

      // Organiser par jour
      const joursMap = new Map<string, JourCreneaux>();

      // Créer les jours avec les examens
      examens?.forEach(examen => {
        const date = examen.date_examen;
        if (!joursMap.has(date)) {
          joursMap.set(date, {
            date,
            creneaux: [],
            totalExamens: 0
          });
        }
        joursMap.get(date)!.totalExamens++;
      });

      // Pour chaque jour, créer les créneaux avec leurs examens
      joursMap.forEach((jour, date) => {
        const examensJour = examens?.filter(e => e.date_examen === date) || [];
        
        creneaux?.forEach(creneau => {
          const examensCouverts = examensJour.filter(examen => 
            verifierCouverture(examen, creneau)
          );

          // Ajouter le créneau seulement s'il a des examens ou si on veut voir tous les créneaux
          jour.creneaux.push({
            id: creneau.id,
            heure_debut: creneau.heure_debut,
            heure_fin: creneau.heure_fin,
            nom_creneau: creneau.nom_creneau,
            is_validated: creneau.is_validated,
            examens: examensCouverts
          });
        });

        // Trier les créneaux par heure
        jour.creneaux.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
      });

      return Array.from(joursMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour supprimer un créneau
  const deleteCreneauMutation = useMutation({
    mutationFn: async (creneauId: string) => {
      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .delete()
        .eq('id', creneauId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-vue-par-jour'] });
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
      toast({
        title: "Créneau supprimé",
        description: "Le créneau a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir la vue par jour des créneaux.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement de la vue par jour...</p>
        </CardContent>
      </Card>
    );
  }

  const totalJours = creneauxParJour.length;
  const totalExamens = creneauxParJour.reduce((sum, jour) => sum + jour.totalExamens, 0);
  const creneauxVides = creneauxParJour.reduce((sum, jour) => 
    sum + jour.creneaux.filter(c => c.examens.length === 0).length, 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Vue par jour - Génération des créneaux</span>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - {totalJours} jours d'examens, {totalExamens} examens validés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Statistiques globales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalJours}</div>
                  <div className="text-sm text-blue-700">Jours d'examens</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalExamens}</div>
                  <div className="text-sm text-green-700">Examens validés</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{creneauxVides}</div>
                  <div className="text-sm text-orange-700">Créneaux vides</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste par jour */}
          <div className="space-y-4">
            {creneauxParJour.map((jour) => (
              <Card key={jour.date} className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateBelgian(jour.date)}</span>
                      <Badge variant="outline">{jour.totalExamens} examens</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(selectedDate === jour.date ? null : jour.date)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {selectedDate === jour.date ? 'Masquer' : 'Détails'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                
                {selectedDate === jour.date && (
                  <CardContent>
                    <div className="space-y-3">
                      {jour.creneaux.map((creneau) => (
                        <Card key={creneau.id} className={`${
                          creneau.examens.length === 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
                        }`}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                                  </Badge>
                                  {creneau.nom_creneau && (
                                    <span className="font-medium">{creneau.nom_creneau}</span>
                                  )}
                                  {creneau.examens.length === 0 ? (
                                    <Badge variant="destructive">Vide</Badge>
                                  ) : (
                                    <Badge variant="default">{creneau.examens.length} examen(s)</Badge>
                                  )}
                                </div>
                                
                                {creneau.examens.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {creneau.examens.map((examen) => (
                                      <div key={examen.id} className="text-sm text-gray-600 flex items-center space-x-2">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                                        <span>•</span>
                                        <span>{examen.matiere}</span>
                                        <span>•</span>
                                        <span>{examen.salle}</span>
                                        {examen.code_examen && (
                                          <>
                                            <span>•</span>
                                            <span>{examen.code_examen}</span>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {creneau.examens.length === 0 && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer le créneau vide</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer le créneau {formatTimeRange(creneau.heure_debut, creneau.heure_fin)} ?
                                        Ce créneau n'a aucun examen associé pour le {formatDateBelgian(jour.date)}.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteCreneauMutation.mutate(creneau.id)}
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {creneauxParJour.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun examen validé trouvé pour cette session.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
