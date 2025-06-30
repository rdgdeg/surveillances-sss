
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { CheckCircle, Calendar, Clock, Edit, Plus, Trash2 } from "lucide-react";
import { useOptimizedCreneaux } from "@/hooks/useOptimizedCreneaux";

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
  type_choix: string;
  nom_examen_selectionne: string;
}

interface NewAvailabilitySlot {
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: string;
  nom_examen_selectionne: string;
}

export const ExistingAvailabilitiesEditor = ({ 
  surveillantId, 
  sessionId, 
  email, 
  onComplete 
}: ExistingAvailabilitiesEditorProps) => {
  const queryClient = useQueryClient();
  const [editingDisponibilites, setEditingDisponibilites] = useState<Record<string, Disponibilite>>({});
  const [newAvailabilities, setNewAvailabilities] = useState<Record<string, NewAvailabilitySlot>>({});

  // Utiliser les créneaux optimisés pour harmoniser la logique
  const { data: optimizedCreneaux = [] } = useOptimizedCreneaux(sessionId);

  // Charger les disponibilités existantes
  const { data: existingDisponibilites = [], isLoading } = useQuery({
    queryKey: ['existing-disponibilites', surveillantId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data as Disponibilite[];
    }
  });

  // Créer les créneaux disponibles à partir des créneaux optimisés
  const availableSlots = optimizedCreneaux
    .filter(slot => slot.type === 'surveillance')
    .map(slot => ({
      key: `${slot.date_examen}|${slot.heure_debut}|${slot.heure_fin}`,
      date_examen: slot.date_examen,
      heure_debut: slot.heure_debut,
      heure_fin: slot.heure_fin,
      label: `${formatDateWithDayBelgian(slot.date_examen)} ${slot.heure_debut}-${slot.heure_fin}`
    }));

  console.log(`[ExistingAvailabilitiesEditor] Generated ${availableSlots.length} available slots from optimized creneaux`);

  // Initialiser les disponibilités en cours d'édition
  useEffect(() => {
    if (existingDisponibilites.length > 0) {
      const editingMap: Record<string, Disponibilite> = {};
      existingDisponibilites.forEach(dispo => {
        editingMap[dispo.id] = { ...dispo };
      });
      setEditingDisponibilites(editingMap);
    }
  }, [existingDisponibilites]);

  // Mutation pour sauvegarder les modifications
  const saveAvailabilitiesMutation = useMutation({
    mutationFn: async () => {
      console.log('[ExistingAvailabilitiesEditor] Saving availabilities...');
      
      // Préparer les mises à jour des disponibilités existantes
      const updates = Object.values(editingDisponibilites).map(dispo => ({
        id: dispo.id,
        type_choix: dispo.type_choix,
        nom_examen_selectionne: dispo.nom_examen_selectionne
      }));

      // Préparer les nouvelles disponibilités
      const nouvelles = Object.values(newAvailabilities).map(slot => ({
        surveillant_id: surveillantId,
        session_id: sessionId,
        date_examen: slot.date_examen,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
        est_disponible: true,
        type_choix: slot.type_choix,
        nom_examen_selectionne: slot.nom_examen_selectionne
      }));

      // Effectuer les mises à jour
      if (updates.length > 0) {
        for (const update of updates) {
          const { error } = await supabase
            .from('disponibilites')
            .update(update)
            .eq('id', update.id);
          
          if (error) throw error;
        }
      }

      // Insérer les nouvelles disponibilités
      if (nouvelles.length > 0) {
        const { error } = await supabase
          .from('disponibilites')
          .insert(nouvelles);
        
        if (error) throw error;
      }

      console.log(`[ExistingAvailabilitiesEditor] Updated ${updates.length} and inserted ${nouvelles.length} availabilities`);
    },
    onSuccess: () => {
      toast({
        title: "Modifications sauvegardées",
        description: "Vos disponibilités ont été mises à jour avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['existing-disponibilites'] });
      onComplete();
    },
    onError: (error) => {
      console.error('[ExistingAvailabilitiesEditor] Error saving availabilities:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive"
      });
    }
  });

  // Mutation pour supprimer une disponibilité
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (disponibiliteId: string) => {
      const { error } = await supabase
        .from('disponibilites')
        .delete()
        .eq('id', disponibiliteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Disponibilité supprimée",
        description: "La disponibilité a été supprimée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['existing-disponibilites'] });
    },
    onError: (error) => {
      console.error('[ExistingAvailabilitiesEditor] Error deleting availability:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive"
      });
    }
  });

  const handleEditDisponibilite = (id: string, field: string, value: string) => {
    setEditingDisponibilites(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleDeleteDisponibilite = (id: string) => {
    deleteAvailabilityMutation.mutate(id);
  };

  const handleAddNewAvailability = (slotKey: string) => {
    const slot = availableSlots.find(s => s.key === slotKey);
    if (!slot) return;

    setNewAvailabilities(prev => ({
      ...prev,
      [slotKey]: {
        date_examen: slot.date_examen,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
        type_choix: 'souhaitee',
        nom_examen_selectionne: ''
      }
    }));
  };

  const handleEditNewAvailability = (slotKey: string, field: string, value: string) => {
    setNewAvailabilities(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        [field]: value
      }
    }));
  };

  const handleRemoveNewAvailability = (slotKey: string) => {
    setNewAvailabilities(prev => {
      const updated = { ...prev };
      delete updated[slotKey];
      return updated;
    });
  };

  const handleSave = () => {
    saveAvailabilitiesMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Chargement de vos disponibilités...</p>
        </CardContent>
      </Card>
    );
  }

  // Filtrer les créneaux disponibles pour l'ajout (exclure ceux déjà déclarés)
  const existingSlotKeys = new Set(existingDisponibilites.map(d => `${d.date_examen}|${d.heure_debut}|${d.heure_fin}`));
  const availableSlotsForAdd = availableSlots.filter(slot => 
    !existingSlotKeys.has(slot.key) && !newAvailabilities[slot.key]
  );

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Modification de vos disponibilités</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Disponibilités existantes */}
            {existingDisponibilites.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Disponibilités actuelles</h3>
                {existingDisponibilites.map((dispo) => (
                  <Card key={dispo.id} className="border-gray-200">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">
                            {formatDateWithDayBelgian(dispo.date_examen)}
                          </span>
                          <Clock className="h-4 w-4 text-gray-500 ml-2" />
                          <span className="text-gray-700">
                            {dispo.heure_debut} - {dispo.heure_fin}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDisponibilite(dispo.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Type de surveillance</Label>
                          <RadioGroup
                            value={editingDisponibilites[dispo.id]?.type_choix || dispo.type_choix}
                            onValueChange={(value) => handleEditDisponibilite(dispo.id, 'type_choix', value)}
                            className="flex space-x-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="souhaitee" id={`souhaitee-${dispo.id}`} />
                              <Label htmlFor={`souhaitee-${dispo.id}`}>Souhaitée</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="obligatoire" id={`obligatoire-${dispo.id}`} />
                              <Label htmlFor={`obligatoire-${dispo.id}`}>Obligatoire</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {editingDisponibilites[dispo.id]?.type_choix === 'obligatoire' && (
                          <div>
                            <Label htmlFor={`nom-examen-${dispo.id}`} className="text-sm font-medium">
                              Nom de l'examen (optionnel)
                            </Label>
                            <Input
                              id={`nom-examen-${dispo.id}`}
                              value={editingDisponibilites[dispo.id]?.nom_examen_selectionne || ''}
                              onChange={(e) => handleEditDisponibilite(dispo.id, 'nom_examen_selectionne', e.target.value)}
                              placeholder="Nom de l'examen pour surveillance obligatoire"
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Nouvelles disponibilités en cours d'ajout */}
            {Object.keys(newAvailabilities).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-700">Nouvelles disponibilités à ajouter</h3>
                {Object.entries(newAvailabilities).map(([slotKey, availability]) => {
                  const slot = availableSlots.find(s => s.key === slotKey);
                  if (!slot) return null;

                  return (
                    <Card key={slotKey} className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {formatDateWithDayBelgian(availability.date_examen)}
                            </span>
                            <Clock className="h-4 w-4 text-gray-500 ml-2" />
                            <span className="text-gray-700">
                              {availability.heure_debut} - {availability.heure_fin}
                            </span>
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              Nouveau
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveNewAvailability(slotKey)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Type de surveillance</Label>
                            <RadioGroup
                              value={availability.type_choix}
                              onValueChange={(value) => handleEditNewAvailability(slotKey, 'type_choix', value)}
                              className="flex space-x-4 mt-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="souhaitee" id={`new-souhaitee-${slotKey}`} />
                                <Label htmlFor={`new-souhaitee-${slotKey}`}>Souhaitée</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="obligatoire" id={`new-obligatoire-${slotKey}`} />
                                <Label htmlFor={`new-obligatoire-${slotKey}`}>Obligatoire</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {availability.type_choix === 'obligatoire' && (
                            <div>
                              <Label htmlFor={`new-nom-examen-${slotKey}`} className="text-sm font-medium">
                                Nom de l'examen (optionnel)
                              </Label>
                              <Input
                                id={`new-nom-examen-${slotKey}`}
                                value={availability.nom_examen_selectionne}
                                onChange={(e) => handleEditNewAvailability(slotKey, 'nom_examen_selectionne', e.target.value)}
                                placeholder="Nom de l'examen pour surveillance obligatoire"
                                className="mt-1"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Ajouter de nouvelles disponibilités */}
            {availableSlotsForAdd.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ajouter de nouvelles disponibilités</h3>
                <div className="grid gap-2">
                  {availableSlotsForAdd.map((slot) => (
                    <div key={slot.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{slot.label}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddNewAvailability(slot.key)}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-center space-x-4 pt-6">
              <Button
                onClick={handleSave}
                disabled={saveAvailabilitiesMutation.isPending}
                className="px-8"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {saveAvailabilitiesMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </Button>
              <Button
                variant="outline"
                onClick={onComplete}
                className="px-8"
              >
                Annuler
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
