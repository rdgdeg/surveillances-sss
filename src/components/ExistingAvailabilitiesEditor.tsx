
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
      return data || [];
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

  // Fusionner les créneaux qui se chevauchent
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
      
      const surveillanceSlots = sortedSlots.map(slot => {
        const startTime = new Date(`2000-01-01T${slot.heure_debut}`);
        startTime.setMinutes(startTime.getMinutes() - 45);
        const heureDebutSurveillance = startTime.toTimeString().slice(0, 5);
        
        return {
          ...slot,
          heure_debut_surveillance: heureDebutSurveillance,
          heure_fin_surveillance: slot.heure_fin
        };
      });

      const mergedSlots: TimeSlot[] = [];
      
      for (const slot of surveillanceSlots) {
        let merged = false;
        
        for (let i = 0; i < mergedSlots.length; i++) {
          const existingSlot = mergedSlots[i];
          
          const newStart = slot.heure_debut_surveillance;
          const newEnd = slot.heure_fin_surveillance;
          const existingStart = existingSlot.heure_debut;
          const existingEnd = existingSlot.heure_fin;
          
          const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
          };
          
          const newStartMin = toMinutes(newStart);
          const newEndMin = toMinutes(newEnd);
          const existingStartMin = toMinutes(existingStart);
          const existingEndMin = toMinutes(existingEnd);
          
          const overlap = !(newEndMin <= existingStartMin || newStartMin >= existingEndMin);
          const adjacent = Math.abs(newStartMin - existingEndMin) <= 15 || Math.abs(existingStartMin - newEndMin) <= 15;
          
          if (overlap || adjacent) {
            const mergedStart = Math.min(newStartMin, existingStartMin);
            const mergedEnd = Math.max(newEndMin, existingEndMin);
            
            const formatTime = (minutes: number) => {
              const h = Math.floor(minutes / 60);
              const m = minutes % 60;
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            };
            
            existingSlot.heure_debut = formatTime(mergedStart);
            existingSlot.heure_fin = formatTime(mergedEnd);
            existingSlot.examens.push({
              id: slot.id,
              matiere: slot.matiere,
              salle: slot.salle
            });
            
            merged = true;
            break;
          }
        }
        
        if (!merged) {
          mergedSlots.push({
            date_examen: date,
            heure_debut: slot.heure_debut_surveillance,
            heure_fin: slot.heure_fin_surveillance,
            examens: [{
              id: slot.id,
              matiere: slot.matiere,
              salle: slot.salle
            }]
          });
        }
      }

      timeSlots.push(...mergedSlots);
    });

    return timeSlots.sort((a, b) => {
      const dateCompare = a.date_examen.localeCompare(b.date_examen);
      if (dateCompare !== 0) return dateCompare;
      return a.heure_debut.localeCompare(b.heure_debut);
    });
  };

  const availableSlots = mergeTimeSlots(examSlots);

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

      {/* Disponibilités existantes */}
      {Object.keys(editingDispos).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disponibilités actuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(editingDispos).map(([key, dispo]) => (
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
      )}

      {/* Créneaux disponibles pour ajout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ajouter de nouvelles disponibilités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableSlots.map((slot, index) => {
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
