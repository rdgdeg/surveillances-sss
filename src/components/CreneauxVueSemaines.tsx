
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface CreneauAvecExamens {
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
    faculte: string;
    enseignant_nom: string;
  }>;
}

interface JourCreneaux {
  date: string;
  dayName: string;
  creneaux: CreneauAvecExamens[];
}

interface SemaineCreneaux {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  jours: JourCreneaux[];
}

interface CreneauFormData {
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string;
}

export const CreneauxVueSemaines = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreneauFormData>({
    heure_debut: "",
    heure_fin: "",
    nom_creneau: ""
  });

  // Récupérer les créneaux par semaine avec leurs examens
  const { data: semainesCreneaux = [], isLoading } = useQuery({
    queryKey: ['creneaux-vue-semaines', activeSession?.id],
    queryFn: async (): Promise<SemaineCreneaux[]> => {
      if (!activeSession?.id) return [];

      // Récupérer tous les examens validés
      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, code_examen, salle, faculte, enseignant_nom')
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

        // L'examen doit commencer au plus tôt 45 minutes après le début du créneau
        const debutSurveillanceMin = examDebutMin - 45;
        return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
      };

      // Fonction pour trouver le créneau optimal (le plus court) pour un examen
      const trouverCreneauOptimal = (examen: any, creneauxPossibles: any[]): any | null => {
        const creneauxCompatibles = creneauxPossibles.filter(creneau => verifierCouverture(examen, creneau));
        
        if (creneauxCompatibles.length === 0) return null;
        
        // Trier par durée croissante et prendre le plus court
        return creneauxCompatibles.sort((a, b) => {
          const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          const dureeA = toMinutes(a.heure_fin) - toMinutes(a.heure_debut);
          const dureeB = toMinutes(b.heure_fin) - toMinutes(b.heure_debut);
          return dureeA - dureeB;
        })[0];
      };

      // Organiser par semaine en ne gardant que les créneaux optimaux
      const semainesMap = new Map<number, SemaineCreneaux>();

      // Fonction pour obtenir le numéro de semaine
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };

      // Traiter chaque jour d'examen
      const datesUniques = [...new Set(examens?.map(e => e.date_examen) || [])];
      
      datesUniques.forEach(date => {
        const dateObj = new Date(date);
        const weekNumber = getWeekNumber(dateObj);
        
        if (!semainesMap.has(weekNumber)) {
          const monday = new Date(dateObj);
          monday.setDate(dateObj.getDate() - dateObj.getDay() + 1);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          
          semainesMap.set(weekNumber, {
            weekNumber,
            weekStart: monday.toISOString().split('T')[0],
            weekEnd: sunday.toISOString().split('T')[0],
            jours: []
          });
        }

        const semaine = semainesMap.get(weekNumber)!;
        const examensJour = examens?.filter(e => e.date_examen === date) || [];
        
        // Créer un map pour regrouper les examens par créneau optimal
        const creneauxOptimaux = new Map<string, CreneauAvecExamens>();
        
        examensJour.forEach(examen => {
          const creneauOptimal = trouverCreneauOptimal(examen, creneaux || []);
          
          if (creneauOptimal) {
            const creneauKey = `${creneauOptimal.id}`;
            
            if (!creneauxOptimaux.has(creneauKey)) {
              creneauxOptimaux.set(creneauKey, {
                id: creneauOptimal.id,
                heure_debut: creneauOptimal.heure_debut,
                heure_fin: creneauOptimal.heure_fin,
                nom_creneau: creneauOptimal.nom_creneau,
                is_validated: creneauOptimal.is_validated,
                examens: []
              });
            }
            
            creneauxOptimaux.get(creneauKey)!.examens.push(examen);
          }
        });

        // N'ajouter le jour que s'il y a des créneaux avec des examens
        if (creneauxOptimaux.size > 0) {
          const creneauxArray = Array.from(creneauxOptimaux.values())
            .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
          
          semaine.jours.push({
            date,
            dayName: dateObj.toLocaleDateString('fr-FR', { weekday: 'long' }),
            creneaux: creneauxArray
          });
        }
      });

      // Trier les jours dans chaque semaine et supprimer les semaines vides
      const semainesFinales = Array.from(semainesMap.values())
        .filter(semaine => semaine.jours.length > 0)
        .map(semaine => ({
          ...semaine,
          jours: semaine.jours.sort((a, b) => a.date.localeCompare(b.date))
        }))
        .sort((a, b) => a.weekNumber - b.weekNumber);

      return semainesFinales;
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour créer un nouveau créneau
  const createCreneauMutation = useMutation({
    mutationFn: async (data: CreneauFormData) => {
      if (!activeSession?.id) throw new Error('Session non active');

      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .insert({
          session_id: activeSession.id,
          heure_debut: data.heure_debut,
          heure_fin: data.heure_fin,
          nom_creneau: data.nom_creneau,
          is_active: true,
          is_validated: true,
          created_by: 'admin'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-vue-semaines'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Créneau créé",
        description: "Le nouveau créneau a été créé avec succès.",
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
      queryClient.invalidateQueries({ queryKey: ['creneaux-vue-semaines'] });
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

  const resetForm = () => {
    setFormData({
      heure_debut: "",
      heure_fin: "",
      nom_creneau: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCreneauMutation.mutate(formData);
  };

  const toggleWeek = (weekNumber: number) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekNumber)) {
      newExpanded.delete(weekNumber);
    } else {
      newExpanded.add(weekNumber);
    }
    setExpandedWeeks(newExpanded);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour voir la vue par semaines.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement de la vue par semaines...</p>
        </CardContent>
      </Card>
    );
  }

  const totalCreneaux = semainesCreneaux.reduce((sum, semaine) => 
    sum + semaine.jours.reduce((daySum, jour) => daySum + jour.creneaux.length, 0), 0
  );

  const totalExamens = semainesCreneaux.reduce((sum, semaine) => 
    sum + semaine.jours.reduce((daySum, jour) => 
      daySum + jour.creneaux.reduce((creneauSum, creneau) => creneauSum + creneau.examens.length, 0), 0
    ), 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Vue par semaines - Créneaux de surveillance optimisés</span>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Nouveau créneau</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau créneau</DialogTitle>
                  <DialogDescription>
                    Ajouter un nouveau créneau de surveillance
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="heure_debut">Heure de début</Label>
                      <Input
                        type="time"
                        id="heure_debut"
                        value={formData.heure_debut}
                        onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="heure_fin">Heure de fin</Label>
                      <Input
                        type="time"
                        id="heure_fin"
                        value={formData.heure_fin}
                        onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nom_creneau">Nom du créneau</Label>
                    <Input
                      id="nom_creneau"
                      value={formData.nom_creneau}
                      onChange={(e) => setFormData({ ...formData, nom_creneau: e.target.value })}
                      placeholder="Ex: Matin Étendu"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">Créer</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - {semainesCreneaux.length} semaines, {totalCreneaux} créneaux optimisés, {totalExamens} examens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {semainesCreneaux.map((semaine) => (
              <Card key={semaine.weekNumber} className="border-gray-200">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleWeek(semaine.weekNumber)}
                  >
                    <div className="flex items-center space-x-2">
                      {expandedWeeks.has(semaine.weekNumber) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>Semaine {semaine.weekNumber}</span>
                      <Badge variant="outline">
                        {formatDateBelgian(semaine.weekStart)} - {formatDateBelgian(semaine.weekEnd)}
                      </Badge>
                      <Badge variant="secondary">{semaine.jours.length} jours</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {expandedWeeks.has(semaine.weekNumber) && (
                  <CardContent>
                    <div className="space-y-4">
                      {semaine.jours.map((jour) => (
                        <Card key={jour.date} className="border-blue-200 bg-blue-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{jour.dayName} {formatDateBelgian(jour.date)}</span>
                              <Badge variant="outline">{jour.creneaux.length} créneaux</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {jour.creneaux.map((creneau) => (
                                <Card key={creneau.id} className="border-green-200 bg-green-50">
                                  <CardContent className="pt-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-3">
                                          <Badge variant="outline" className="font-medium">
                                            {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                                          </Badge>
                                          {creneau.nom_creneau && (
                                            <span className="font-medium text-blue-700">{creneau.nom_creneau}</span>
                                          )}
                                          <Badge variant="default" className="bg-green-600">
                                            {creneau.examens.length} examen(s)
                                          </Badge>
                                        </div>
                                        
                                        <div className="space-y-2">
                                          {creneau.examens.map((examen) => (
                                            <div key={examen.id} className="bg-white p-3 rounded border border-gray-200">
                                              <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                  <div className="font-medium text-gray-900">{examen.matiere}</div>
                                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                    <div className="flex items-center space-x-1">
                                                      <Clock className="h-3 w-3" />
                                                      <span>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                                                    </div>
                                                    <span>•</span>
                                                    <span className="font-medium">{examen.salle}</span>
                                                    {examen.faculte && (
                                                      <>
                                                        <span>•</span>
                                                        <span className="text-blue-600">{examen.faculte}</span>
                                                      </>
                                                    )}
                                                  </div>
                                                  {examen.enseignant_nom && (
                                                    <div className="text-xs text-gray-500">
                                                      Enseignant: {examen.enseignant_nom}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex flex-col items-end text-xs text-gray-500">
                                                  {examen.code_examen && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {examen.code_examen}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2 ml-4">
                                        <Button size="sm" variant="outline">
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive">
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Supprimer le créneau</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Êtes-vous sûr de vouloir supprimer le créneau {formatTimeRange(creneau.heure_debut, creneau.heure_fin)} 
                                                du {formatDateBelgian(jour.date)} ? Ce créneau contient {creneau.examens.length} examen(s).
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
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
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

          {semainesCreneaux.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun créneau avec examens trouvé pour cette session.</p>
              <p className="text-sm mt-2">Les créneaux ne sont créés que s'ils contiennent des examens validés.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
