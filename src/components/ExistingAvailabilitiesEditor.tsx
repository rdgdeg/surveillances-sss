import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, AlertCircle, CheckCircle, Calendar, Clock, Edit3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface ExistingAvailabilitiesEditorProps {
  surveillantId: string;
  sessionId: string;
  email: string;
  onComplete: () => void;
}

interface Disponibilite {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: 'souhaitee' | 'obligatoire';
  nom_examen_obligatoire?: string;
}

interface TimeSlot {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  examens: Array<{
    id: string;
    matiere: string;
    salle: string;
  }>;
}

export const ExistingAvailabilitiesEditor = ({ surveillantId, sessionId, email, onComplete }: ExistingAvailabilitiesEditorProps) => {
  const queryClient = useQueryClient();
  const [editingDispos, setEditingDispos] = useState<Record<string, Disponibilite>>({});
  const [newDispos, setNewDispos] = useState<Record<string, { type_choix: 'souhaitee' | 'obligatoire'; nom_examen_obligatoire: string }>>({});

  // Récupérer les disponibilités existantes
  const { data: existingDispos = [] } = useQuery({
    queryKey: ['existing-disponibilites', surveillantId, sessionId],
    queryFn: async (): Promise<Disponibilite[]> => {
      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      
      // Transformer les données pour s'assurer que type_choix a le bon type
      return (data || []).map(item => ({
        ...item,
        type_choix: item.type_choix as 'souhaitee' | 'obligatoire'
      }));
    }
  });

  // Récupérer les créneaux d'examens disponibles
  const { data: examSlots = [] } = useQuery({
    queryKey: ['exam-slots', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    }
  });

  // Définir les créneaux de surveillance fixes
  const creneauxSurveillance = [
    { debut: '08:15', fin: '11:00' },
    { debut: '08:15', fin: '12:00' },
    { debut: '12:15', fin: '15:00' },
    { debut: '15:15', fin: '18:00' },
    { debut: '15:45', fin: '18:30' }
  ];

  // Fonction pour convertir les examens en créneaux de surveillance selon vos spécifications
  const mergeTimeSlots = (slots: any[]): TimeSlot[] => {
    const groupedByDate: Record<string, any[]> = {};
    
    // Grouper par date
    slots.forEach(slot => {
      if (!groupedByDate[slot.date_examen]) {
        groupedByDate[slot.date_examen] = [];
      }
      groupedByDate[slot.date_examen].push(slot);
    });

    const timeSlots: TimeSlot[] = [];

    Object.entries(groupedByDate).forEach(([date, dateSlots]) => {
      // Pour chaque date, déterminer quels créneaux de surveillance sont nécessaires
      const creneauxNecessaires = new Set<string>();
      
      dateSlots.forEach(exam => {
        const examDebut = exam.heure_debut;
        const examFin = exam.heure_fin;
        
        // Déterminer quel(s) créneau(x) de surveillance couvre(nt) cet examen
        creneauxSurveillance.forEach(creneau => {
          // Convertir en minutes pour faciliter la comparaison
          const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          
          const creneauDebutMin = toMinutes(creneau.debut);
          const creneauFinMin = toMinutes(creneau.fin);
          const examDebutMin = toMinutes(examDebut);
          const examFinMin = toMinutes(examFin);
          
          // Vérifier si l'examen est couvert par ce créneau de surveillance
          // L'examen doit commencer au plus tôt 45 minutes après le début du créneau
          // et finir au plus tard à la fin du créneau
          const debutSurveillanceMin = examDebutMin - 45;
          
          if (debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin) {
            creneauxNecessaires.add(`${creneau.debut}-${creneau.fin}`);
          }
        });
      });
      
      // Créer les créneaux de surveillance pour cette date
      creneauxNecessaires.forEach(creneauKey => {
        const [debut, fin] = creneauKey.split('-');
        
        // Trouver tous les examens couverts par ce créneau
        const examensCouverts = dateSlots.filter(exam => {
          const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          
          const creneauDebutMin = toMinutes(debut);
          const creneauFinMin = toMinutes(fin);
          const examDebutMin = toMinutes(exam.heure_debut);
          const examFinMin = toMinutes(exam.heure_fin);
          const debutSurveillanceMin = examDebutMin - 45;
          
          return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
        });
        
        if (examensCouverts.length > 0) {
          timeSlots.push({
            date_examen: date,
            heure_debut: debut,
            heure_fin: fin,
            examens: examensCouverts.map(exam => ({
              id: exam.id,
              matiere: exam.matiere,
              salle: exam.salle
            }))
          });
        }
      });
    });

    return timeSlots.sort((a, b) => {
      const dateCompare = a.date_examen.localeCompare(b.date_examen);
      if (dateCompare !== 0) return dateCompare;
      return a.heure_debut.localeCompare(b.heure_debut);
    });
  };

  const availableSlots = mergeTimeSlots(examSlots);

  // Organiser par semaine
  const organizeByWeek = (slots: TimeSlot[]) => {
    const weeks: Record<string, TimeSlot[]> = {};

    slots.forEach(slot => {
      const date = new Date(slot.date_examen);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = `${format(weekStart, 'dd/MM', { locale: fr })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(slot);
    });

    return weeks;
  };

  const weeklySlots = organizeByWeek(availableSlots);

  // Organiser les disponibilités existantes par semaine aussi
  const organizeExistingByWeek = (dispos: Record<string, Disponibilite>) => {
    const weeks: Record<string, Array<{ key: string; dispo: Disponibilite }>> = {};

    Object.entries(dispos).forEach(([key, dispo]) => {
      const date = new Date(dispo.date_examen);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = `${format(weekStart, 'dd/MM', { locale: fr })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })}`;

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push({ key, dispo });
    });

    // Trier par date et heure
    Object.keys(weeks).forEach(weekKey => {
      weeks[weekKey].sort((a, b) => {
        const dateCompare = a.dispo.date_examen.localeCompare(b.dispo.date_examen);
        if (dateCompare !== 0) return dateCompare;
        return a.dispo.heure_debut.localeCompare(b.dispo.heure_debut);
      });
    });

    return weeks;
  };

  const existingWeeklyDispos = organizeExistingByWeek(editingDispos);

  // Initialiser les disponibilités en édition
  useEffect(() => {
    const editing: Record<string, Disponibilite> = {};
    existingDispos.forEach(dispo => {
      const key = `${dispo.date_examen}|${dispo.heure_debut}|${dispo.heure_fin}`;
      editing[key] = dispo;
    });
    setEditingDispos(editing);
  }, [existingDispos]);

  // Mutation pour sauvegarder les modifications
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Supprimer toutes les anciennes disponibilités
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId);

      // Préparer les nouvelles disponibilités (existantes modifiées + nouvelles)
      const allDispos = [
        ...Object.values(editingDispos),
        ...Object.entries(newDispos).map(([key, value]) => {
          const [date_examen, heure_debut, heure_fin] = key.split('|');
          return {
            surveillant_id: surveillantId,
            session_id: sessionId,
            date_examen,
            heure_debut,
            heure_fin,
            est_disponible: true,
            type_choix: value.type_choix,
            nom_examen_obligatoire: value.nom_examen_obligatoire
          };
        })
      ].map(dispo => ({
        surveillant_id: surveillantId,
        session_id: sessionId,
        date_examen: dispo.date_examen,
        heure_debut: dispo.heure_debut,
        heure_fin: dispo.heure_fin,
        est_disponible: true,
        type_choix: dispo.type_choix,
        nom_examen_obligatoire: dispo.nom_examen_obligatoire || null
      }));

      if (allDispos.length > 0) {
        const { error } = await supabase
          .from('disponibilites')
          .insert(allDispos);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Disponibilités sauvegardées",
        description: "Vos modifications ont été enregistrées avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['existing-disponibilites'] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleUpdateExisting = (key: string, field: keyof Disponibilite, value: any) => {
    setEditingDispos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleDeleteExisting = (key: string) => {
    setEditingDispos(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const handleAddNew = (slot: TimeSlot) => {
    const key = `${slot.date_examen}|${slot.heure_debut}|${slot.heure_fin}`;
    setNewDispos(prev => ({
      ...prev,
      [key]: {
        type_choix: 'souhaitee',
        nom_examen_obligatoire: ''
      }
    }));
  };

  const handleUpdateNew = (key: string, field: 'type_choix' | 'nom_examen_obligatoire', value: any) => {
    setNewDispos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleRemoveNew = (key: string) => {
    setNewDispos(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const isSlotAlreadySelected = (slot: TimeSlot) => {
    const key = `${slot.date_examen}|${slot.heure_debut}|${slot.heure_fin}`;
    return key in editingDispos || key in newDispos;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Edit3 className="h-5 w-5" />
            <span>Modifier mes disponibilités</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Email : {email} • Modifiez vos disponibilités existantes ou ajoutez-en de nouvelles
          </p>
        </CardHeader>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Créneaux de surveillance disponibles</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Les créneaux proposés correspondent aux plages de surveillance : 8h15-11h00, 8h15-12h00, 12h15-15h00, 15h15-18h00, 15h45-18h30
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Chaque créneau inclut jusqu'à 45 minutes de préparation avant le premier examen.
        </p>
      </div>

      {/* Disponibilités existantes organisées par semaine */}
      {Object.keys(existingWeeklyDispos).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Mes disponibilités actuelles</h2>
          {Object.entries(existingWeeklyDispos).map(([weekLabel, weekDispos]) => (
            <Card key={weekLabel} className="border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-blue-700">
                  Semaine du {weekLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weekDispos.map(({ key, dispo }) => (
                    <Card key={key} className="border-blue-200 bg-blue-50">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {formatDateBelgian(dispo.date_examen)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>{formatTimeRange(dispo.heure_debut, dispo.heure_fin)}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExisting(key)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-3 p-3 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={dispo.type_choix === 'obligatoire'}
                                onCheckedChange={(checked) => 
                                  handleUpdateExisting(key, 'type_choix', checked ? 'obligatoire' : 'souhaitee')
                                }
                              />
                              <Label className="text-sm font-medium">
                                Surveillance obligatoire
                              </Label>
                            </div>

                            {dispo.type_choix === 'obligatoire' && (
                              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <AlertCircle className="h-4 w-4 text-orange-600" />
                                  <span className="font-medium text-orange-800 text-sm">
                                    Code de l'examen obligatoire
                                  </span>
                                </div>
                                <Input
                                  value={dispo.nom_examen_obligatoire || ''}
                                  onChange={(e) => handleUpdateExisting(key, 'nom_examen_obligatoire', e.target.value)}
                                  placeholder="Ex: LECON2100"
                                  className="text-sm"
                                />
                              </div>
                            )}
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
      )}

      {/* Créneaux disponibles pour ajout organisés par semaine */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Ajouter de nouvelles disponibilités</h2>
        {Object.keys(weeklySlots).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">
                Aucun créneau disponible pour cette session.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(weeklySlots).map(([weekLabel, slots]) => (
            <Card key={weekLabel} className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-gray-700">
                  Semaine du {weekLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {slots.map((slot, index) => {
                    const key = `${slot.date_examen}|${slot.heure_debut}|${slot.heure_fin}`;
                    const isSelected = isSlotAlreadySelected(slot);
                    const isNewlyAdded = key in newDispos;

                    return (
                      <Card key={index} className={`border transition-colors ${
                        isNewlyAdded ? 'border-green-300 bg-green-50' : 
                        isSelected ? 'border-gray-300 bg-gray-100' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    {formatDateBelgian(slot.date_examen)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span>{formatTimeRange(slot.heure_debut, slot.heure_fin)}</span>
                                </div>
                              </div>
                              
                              {!isSelected ? (
                                <Button
                                  onClick={() => handleAddNew(slot)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Ajouter
                                </Button>
                              ) : isNewlyAdded ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveNew(key)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Badge variant="secondary">Déjà sélectionné</Badge>
                              )}
                            </div>

                            {isNewlyAdded && (
                              <div className="space-y-3 p-3 bg-white rounded border">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={newDispos[key]?.type_choix === 'obligatoire'}
                                    onCheckedChange={(checked) => 
                                      handleUpdateNew(key, 'type_choix', checked ? 'obligatoire' : 'souhaitee')
                                    }
                                  />
                                  <Label className="text-sm font-medium">
                                    Surveillance obligatoire
                                  </Label>
                                </div>

                                {newDispos[key]?.type_choix === 'obligatoire' && (
                                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-orange-600" />
                                      <span className="font-medium text-orange-800 text-sm">
                                        Code de l'examen obligatoire
                                      </span>
                                    </div>
                                    <Input
                                      value={newDispos[key]?.nom_examen_obligatoire || ''}
                                      onChange={(e) => handleUpdateNew(key, 'nom_examen_obligatoire', e.target.value)}
                                      placeholder="Ex: LECON2100"
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Afficher les examens couverts par ce créneau */}
                            {slot.examens.length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p className="text-xs text-gray-600 font-medium mb-1">Examens couverts :</p>
                                {slot.examens.map((examen, idx) => (
                                  <p key={idx} className="text-xs text-gray-500">
                                    {examen.matiere} - {examen.salle}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          onClick={onComplete}
        >
          Annuler
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
          className="px-8"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </Button>
      </div>
    </div>
  );
};
