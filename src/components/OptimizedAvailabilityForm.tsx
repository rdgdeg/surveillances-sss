
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Check, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { useOptimizedCreneaux } from "@/hooks/useOptimizedCreneaux";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

interface OptimizedAvailabilityFormProps {
  surveillantId: string;
  sessionId: string;
  email: string;
  onSuccess: () => void;
}

interface DisponibiliteData {
  type_choix: 'souhaitee' | 'obligatoire';
  nom_examen_obligatoire: string;
}

export const OptimizedAvailabilityForm = ({ 
  surveillantId, 
  sessionId, 
  email, 
  onSuccess 
}: OptimizedAvailabilityFormProps) => {
  const queryClient = useQueryClient();
  const { data: optimizedCreneaux = [], isLoading } = useOptimizedCreneaux(sessionId);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, DisponibiliteData>>({});

  // Organiser par semaine
  const organizeByWeek = (slots: any[]) => {
    const weeks: Record<string, any[]> = {};

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

    // Trier les créneaux dans chaque semaine
    Object.keys(weeks).forEach(weekKey => {
      weeks[weekKey].sort((a, b) => {
        const dateCompare = a.date_examen.localeCompare(b.date_examen);
        if (dateCompare !== 0) return dateCompare;
        return a.heure_debut.localeCompare(b.heure_debut);
      });
    });

    return weeks;
  };

  const weeklySlots = organizeByWeek(optimizedCreneaux);

  // Mutation pour sauvegarder les disponibilités
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Supprimer les anciennes disponibilités
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', sessionId);

      // Préparer les nouvelles disponibilités
      const disponibilites = Object.entries(selectedSlots).map(([key, data]) => {
        const [date_examen, heure_debut, heure_fin] = key.split('|');
        return {
          surveillant_id: surveillantId,
          session_id: sessionId,
          date_examen,
          heure_debut,
          heure_fin,
          est_disponible: true,
          type_choix: data.type_choix,
          nom_examen_obligatoire: data.nom_examen_obligatoire || null
        };
      });

      if (disponibilites.length > 0) {
        const { error } = await supabase
          .from('disponibilites')
          .insert(disponibilites);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Disponibilités enregistrées",
        description: "Vos disponibilités ont été enregistrées avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['existing-disponibilites'] });
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

  const handleSlotChange = (slotKey: string, checked: boolean) => {
    if (checked) {
      setSelectedSlots(prev => ({
        ...prev,
        [slotKey]: {
          type_choix: 'souhaitee',
          nom_examen_obligatoire: ''
        }
      }));
    } else {
      setSelectedSlots(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    }
  };

  const handleTypeChange = (slotKey: string, type: 'souhaitee' | 'obligatoire') => {
    setSelectedSlots(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        type_choix: type
      }
    }));
  };

  const handleNomExamenChange = (slotKey: string, value: string) => {
    setSelectedSlots(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        nom_examen_obligatoire: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(selectedSlots).length === 0) {
      toast({
        title: "Aucune disponibilité sélectionnée",
        description: "Veuillez sélectionner au moins un créneau.",
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse text-center">
            Chargement des créneaux optimisés...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span>Déclarez vos disponibilités</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Sélectionnez les créneaux où vous êtes disponible pour surveiller des examens.
            Les créneaux proposés sont optimisés selon les examens planifiés.
          </p>
        </CardHeader>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <Check className="h-5 w-5" />
          <span className="font-medium">Créneaux de surveillance optimisés</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Ces créneaux correspondent exactement aux besoins de surveillance des examens validés.
          Chaque créneau inclut le temps de préparation nécessaire (45 minutes avant le premier examen).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.keys(weeklySlots).length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Aucun créneau de surveillance disponible pour cette session.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Les créneaux apparaîtront une fois que des examens seront validés.
                </p>
              </div>
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
                  {slots.map((slot) => {
                    const slotKey = `${slot.date_examen}|${slot.heure_debut}|${slot.heure_fin}`;
                    const isSelected = slotKey in selectedSlots;
                    const selectedData = selectedSlots[slotKey];

                    return (
                      <Card key={slotKey} className={`border transition-colors ${
                        isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSlotChange(slotKey, !!checked)}
                                />
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
                              <Badge variant="outline">
                                {slot.examens.length} examen{slot.examens.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>

                            {/* Afficher les examens de ce créneau */}
                            <div className="ml-6 space-y-2">
                              <p className="text-sm font-medium text-gray-700">Examens dans ce créneau :</p>
                              {slot.examens.map((examen: any) => (
                                <div key={examen.id} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                                  <span className="font-medium">{examen.matiere}</span>
                                  <span className="mx-2">•</span>
                                  <span>{formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                                  <span className="mx-2">•</span>
                                  <span>{examen.salle}</span>
                                </div>
                              ))}
                            </div>

                            {isSelected && (
                              <div className="space-y-3 p-3 bg-white rounded border ml-6">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedData?.type_choix === 'obligatoire'}
                                    onCheckedChange={(checked) => 
                                      handleTypeChange(slotKey, checked ? 'obligatoire' : 'souhaitee')
                                    }
                                  />
                                  <Label className="text-sm font-medium">
                                    Surveillance obligatoire
                                  </Label>
                                </div>

                                {selectedData?.type_choix === 'obligatoire' && (
                                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <AlertCircle className="h-4 w-4 text-orange-600" />
                                      <span className="font-medium text-orange-800 text-sm">
                                        Code de l'examen obligatoire
                                      </span>
                                    </div>
                                    <Input
                                      value={selectedData.nom_examen_obligatoire}
                                      onChange={(e) => handleNomExamenChange(slotKey, e.target.value)}
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
          ))
        )}

        {Object.keys(weeklySlots).length > 0 && (
          <div className="flex justify-center space-x-4">
            <Button
              type="submit"
              disabled={saveMutation.isPending || Object.keys(selectedSlots).length === 0}
              className="px-8"
            >
              {saveMutation.isPending 
                ? "Enregistrement..." 
                : `Enregistrer mes ${Object.keys(selectedSlots).length} disponibilité${Object.keys(selectedSlots).length !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
