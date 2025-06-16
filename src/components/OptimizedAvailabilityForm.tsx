import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { Calendar, Clock, Send, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

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

interface DisponibiliteForm {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix: 'souhaitee' | 'obligatoire';
  nom_examen_selectionne: string;
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

  // Récupérer les disponibilités existantes avec debug
  const { data: existingDisponibilites } = useQuery({
    queryKey: ['surveillant-disponibilites', surveillantId, sessionId],
    queryFn: async () => {
      if (!surveillantId || !sessionId) return [];
      
      console.log('Fetching disponibilites for:', { surveillantId, sessionId });

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error fetching disponibilites:', error);
        throw error;
      }
      
      console.log('Found existing disponibilites:', data);
      return data || [];
    },
    enabled: !!surveillantId && !!sessionId
  });

  // Fusionner les créneaux
  const mergeTimeSlots = (slots: any[]): TimeSlot[] => {
    const groupedByDate: Record<string, any[]> = {};
    
    slots.forEach(slot => {
      if (!groupedByDate[slot.date_examen]) {
        groupedByDate[slot.date_examen] = [];
      }
      groupedByDate[slot.date_examen].push(slot);
    });

    const timeSlots: TimeSlot[] = [];

    Object.entries(groupedByDate).forEach(([date, dateSlots]) => {
      const sortedSlots = [...dateSlots].sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
      
      const mergedSlots: TimeSlot[] = [];
      
      sortedSlots.forEach(slot => {
        const startTime = new Date(`2000-01-01T${slot.heure_debut}`);
        startTime.setMinutes(startTime.getMinutes() - 45);
        const heureDebutSurveillance = startTime.toTimeString().slice(0, 5);
        
        const existingSlot = mergedSlots.find(existing => 
          existing.date_examen === date &&
          existing.heure_debut <= heureDebutSurveillance &&
          existing.heure_fin >= slot.heure_fin
        );

        if (existingSlot) {
          existingSlot.examens.push({
            id: slot.id,
            matiere: slot.matiere,
            salle: slot.salle
          });
        } else {
          mergedSlots.push({
            date_examen: date,
            heure_debut: heureDebutSurveillance,
            heure_fin: slot.heure_fin,
            examens: [{
              id: slot.id,
              matiere: slot.matiere,
              salle: slot.salle
            }]
          });
        }
      });

      timeSlots.push(...mergedSlots);
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

  // Charger les disponibilités existantes avec debug amélioré
  useEffect(() => {
    if (existingDisponibilites && existingDisponibilites.length > 0) {
      console.log('Loading existing disponibilites:', existingDisponibilites);
      const newAvailabilities: Record<string, DisponibiliteForm> = {};
      
      existingDisponibilites.forEach(dispo => {
        const key = `${dispo.date_examen}-${dispo.heure_debut}-${dispo.heure_fin}`;
        console.log('Processing dispo with key:', key, dispo);
        
        const typeChoix = dispo.type_choix === 'obligatoire' ? 'obligatoire' : 'souhaitee';
        
        newAvailabilities[key] = {
          date_examen: dispo.date_examen,
          heure_debut: dispo.heure_debut,
          heure_fin: dispo.heure_fin,
          est_disponible: true, // Si elle existe en base, elle est disponible
          type_choix: typeChoix,
          nom_examen_selectionne: dispo.nom_examen_selectionne || '',
          nom_examen_obligatoire: dispo.nom_examen_obligatoire || '',
          commentaire_surveillance_obligatoire: dispo.commentaire_surveillance_obligatoire || ''
        };
      });
      
      console.log('Final availabilities object:', newAvailabilities);
      setAvailabilities(newAvailabilities);
    }
  }, [existingDisponibilites]);

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
            nom_examen_selectionne: av.nom_examen_selectionne,
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
      setAvailabilities(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    } else {
      setAvailabilities(prev => ({
        ...prev,
        [slotKey]: {
          date_examen: slot.date_examen,
          heure_debut: slot.heure_debut,
          heure_fin: slot.heure_fin,
          est_disponible: true,
          type_choix: 'souhaitee',
          nom_examen_selectionne: ''
        }
      }));
    }
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Conseil : Maximisez vos chances d'attribution</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Plus vous sélectionnez de créneaux, plus nous pourrons optimiser la répartition. 
          Sélectionnez tous les créneaux où vous pourriez être disponible !
        </p>
      </div>

      {Object.keys(weeklySlots).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Aucun examen trouvé pour cette session.
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

                    return (
                      <Card key={index} className={`border transition-colors ${isAvailable ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start space-x-4">
                            <Checkbox
                              checked={isAvailable}
                              onCheckedChange={() => toggleAvailability(slot)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
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
                                    (incl. 45min préparation)
                                  </span>
                                </div>
                              </div>

                              {isAvailable && (
                                <div className="space-y-4 mt-4 p-4 bg-white rounded border">
                                  {/* Question principale sur le type de surveillance */}
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <HelpCircle className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium text-blue-800">
                                        S'agit-il d'un créneau à surveiller de manière obligatoire ou souhaitée ?
                                      </span>
                                    </div>
                                    <Select
                                      value={availability.type_choix}
                                      onValueChange={(value: 'souhaitee' | 'obligatoire') => handleAvailabilityChange(slotKey, 'type_choix', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="souhaitee">Souhaitée - Je peux surveiller ce créneau</SelectItem>
                                        <SelectItem value="obligatoire">Obligatoire - Je dois absolument surveiller ce créneau</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Champs supplémentaires conditionnels */}
                                  <div className="grid grid-cols-1 gap-4">
                                    <div>
                                      <Label className="text-sm">Code examen spécifique (optionnel)</Label>
                                      <Input
                                        value={availability.nom_examen_selectionne || ''}
                                        onChange={(e) => handleAvailabilityChange(slotKey, 'nom_examen_selectionne', e.target.value)}
                                        placeholder="Ex: LECON2100"
                                        className="mt-1"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Si vous souhaitez surveiller un examen particulier de ce créneau
                                      </p>
                                    </div>

                                    {availability.type_choix === 'obligatoire' && (
                                      <>
                                        <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <AlertCircle className="h-4 w-4 text-orange-600" />
                                            <span className="font-medium text-orange-800">
                                              Surveillance obligatoire - Informations requises
                                            </span>
                                          </div>
                                          <div className="space-y-3">
                                            <div>
                                              <Label className="text-sm">Nom de l'examen obligatoire *</Label>
                                              <Input
                                                value={availability.nom_examen_obligatoire || ''}
                                                onChange={(e) => handleAvailabilityChange(slotKey, 'nom_examen_obligatoire', e.target.value)}
                                                placeholder="Nom complet de l'examen"
                                                className="mt-1"
                                                required
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-sm">Justification (obligatoire) *</Label>
                                              <Textarea
                                                value={availability.commentaire_surveillance_obligatoire || ''}
                                                onChange={(e) => handleAvailabilityChange(slotKey, 'commentaire_surveillance_obligatoire', e.target.value)}
                                                placeholder="Pourquoi cette surveillance est-elle obligatoire pour vous ? (ex: vous enseignez cette matière, responsabilité spécifique, etc.)"
                                                className="mt-1"
                                                rows={2}
                                                required
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
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
