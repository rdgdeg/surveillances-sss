
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { Calendar, Clock, Send, CheckCircle, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface TimeSlot {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
}

interface DisponibiliteForm {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix: 'souhaitee' | 'obligatoire';
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

interface OptimizedAvailabilityFormProps {
  surveillantId: string;
  sessionId: string;
  email: string;
  onSuccess: () => void;
}

export const OptimizedAvailabilityForm = ({ surveillantId, sessionId, email, onSuccess }: OptimizedAvailabilityFormProps) => {
  const queryClient = useQueryClient();
  const [availabilities, setAvailabilities] = useState<Record<string, DisponibiliteForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les créneaux d'examens pour la session spécifiée
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
    },
    enabled: !!sessionId
  });

  // Récupérer les créneaux de surveillance configurés et validés pour la session
  const { data: creneauxConfig = [] } = useQuery({
    queryKey: ['creneaux-surveillance-config-valides', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('creneaux_surveillance_config')
        .select('heure_debut, heure_fin')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId
  });

  // Convertir les créneaux configurés au format attendu
  const creneauxSurveillance = creneauxConfig.map(c => ({
    debut: c.heure_debut,
    fin: c.heure_fin
  }));

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
        // L'examen doit commencer au plus tôt 45 minutes après le début du créneau
        // et finir au plus tard à la fin du créneau
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
        
        timeSlots.push({
          date_examen: date,
          heure_debut: debut,
          heure_fin: fin
        });
      });
    });

    return timeSlots.sort((a, b) => {
      const dateCompare = a.date_examen.localeCompare(b.date_examen);
      if (dateCompare !== 0) return dateCompare;
      return a.heure_debut.localeCompare(b.heure_debut);
    });
  };

  const timeSlots = mergeTimeSlots(examSlots);

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

  const weeklySlots = organizeByWeek(timeSlots);

  // Mutation pour sauvegarder
  const saveDisponibilitesMutation = useMutation({
    mutationFn: async () => {
      if (!surveillantId || !sessionId) throw new Error('Données manquantes');

      const availabilityList = Object.values(availabilities).filter(av => av.est_disponible);

      if (availabilityList.length === 0) {
        throw new Error('Veuillez sélectionner au moins une disponibilité');
      }

      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId);

      const { error } = await supabase
        .from('disponibilites')
        .insert(
          availabilityList.map(av => ({
            surveillant_id: surveillantId,
            session_id: sessionId,
            date_examen: av.date_examen,
            heure_debut: av.heure_debut,
            heure_fin: av.heure_fin,
            est_disponible: true,
            type_choix: av.type_choix,
            nom_examen_obligatoire: av.nom_examen_obligatoire,
            commentaire_surveillance_obligatoire: av.commentaire_surveillance_obligatoire
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Disponibilités sauvegardées",
        description: "Vos disponibilités ont été enregistrées avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['surveillant-disponibilites'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAvailabilityChange = (slotKey: string, field: keyof DisponibiliteForm, value: any) => {
    setAvailabilities(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        [field]: value
      }
    }));
  };

  const toggleAvailability = (slot: TimeSlot) => {
    const slotKey = `${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`;
    const currentAvailability = availabilities[slotKey];
    
    if (currentAvailability?.est_disponible) {
      // Désélectionner le créneau
      setAvailabilities(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    } else {
      // Sélectionner le créneau avec valeurs par défaut
      setAvailabilities(prev => ({
        ...prev,
        [slotKey]: {
          date_examen: slot.date_examen,
          heure_debut: slot.heure_debut,
          heure_fin: slot.heure_fin,
          est_disponible: true,
          type_choix: 'souhaitee', // Par défaut souhaitée
          nom_examen_obligatoire: ''
        }
      }));
    }
  };

  const toggleObligatoire = (slotKey: string) => {
    setAvailabilities(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        type_choix: prev[slotKey]?.type_choix === 'obligatoire' ? 'souhaitee' : 'obligatoire',
        // Effacer le code examen si on passe en souhaité
        nom_examen_obligatoire: prev[slotKey]?.type_choix === 'obligatoire' ? '' : prev[slotKey]?.nom_examen_obligatoire || '',
        commentaire_surveillance_obligatoire: prev[slotKey]?.type_choix === 'obligatoire' ? '' : 'Surveillance obligatoire'
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveDisponibilitesMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.values(availabilities).filter(av => av.est_disponible).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Mes disponibilités</span>
          </CardTitle>
          <CardDescription>
            Email : {email} • {selectedCount} créneau{selectedCount > 1 ? 'x' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      {creneauxSurveillance.length > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Créneaux de surveillance disponibles ({creneauxSurveillance.length})</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Les créneaux proposés correspondent aux plages de surveillance validées pour cette session.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            <strong>Temps de préparation :</strong> Maximum 45 minutes mais dépend du secrétariat (peut être inférieur).
          </p>
        </div>
      ) : (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Aucun créneau de surveillance configuré</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              L'administrateur doit configurer et valider des créneaux de surveillance pour cette session avant que vous puissiez saisir vos disponibilités.
            </p>
          </CardContent>
        </Card>
      )}

      {Object.keys(weeklySlots).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Aucun examen trouvé pour cette session.
            </p>
          </CardContent>
        </Card>
      ) : creneauxSurveillance.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Impossible de calculer les créneaux de disponibilité sans configuration des créneaux de surveillance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(weeklySlots).map(([weekLabel, slots]) => (
            <Card key={weekLabel} className="border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-blue-700">
                  Semaine du {weekLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slots.map((slot, index) => {
                    const slotKey = `${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`;
                    const availability = availabilities[slotKey];
                    const isAvailable = availability?.est_disponible || false;
                    const isObligatoire = availability?.type_choix === 'obligatoire';

                    return (
                      <Card key={index} className={`border transition-colors ${isAvailable ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            {/* Sélection du créneau */}
                            <div className="flex items-start space-x-4">
                              <Checkbox
                                checked={isAvailable}
                                onCheckedChange={() => toggleAvailability(slot)}
                                className="mt-1"
                              />
                              <div className="flex-1">
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
                                    <span className="text-xs text-gray-500">
                                      (incl. préparation)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Options supplémentaires si le créneau est sélectionné */}
                            {isAvailable && (
                              <div className="ml-8 space-y-3 p-3 bg-white rounded border">
                                {/* Case surveillance obligatoire */}
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={isObligatoire}
                                    onCheckedChange={() => toggleObligatoire(slotKey)}
                                  />
                                  <Label className="text-sm font-medium">
                                    Surveillance obligatoire
                                  </Label>
                                </div>

                                {/* Code examen si obligatoire */}
                                {isObligatoire && (
                                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-orange-600" />
                                      <span className="font-medium text-orange-800 text-sm">
                                        Code de l'examen obligatoire
                                      </span>
                                    </div>
                                    <Input
                                      value={availability.nom_examen_obligatoire || ''}
                                      onChange={(e) => handleAvailabilityChange(slotKey, 'nom_examen_obligatoire', e.target.value)}
                                      placeholder="Ex: LECON2100"
                                      className="text-sm"
                                    />
                                    <p className="text-xs text-orange-700 mt-1">
                                      Indiquez le code exact de l'examen que vous devez absolument surveiller
                                    </p>
                                  </div>
                                )}
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
          ))}

          <div className="flex justify-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
              <div className="text-sm text-gray-600">créneaux sélectionnés</div>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedCount === 0}
              size="lg"
              className="px-8"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sauvegarde...' : 'Enregistrer mes disponibilités'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
