
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Check, AlertCircle, Users, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { useOptimizedCreneaux } from "@/hooks/useOptimizedCreneaux";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [remarques, setRemarques] = useState("");
  const [surveillantType, setSurveillantType] = useState<string>("");

  // Récupérer le type de surveillant
  useEffect(() => {
    const fetchSurveillantType = async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .select('type')
        .eq('id', surveillantId)
        .single();
      
      if (!error && data) {
        setSurveillantType(data.type);
      }
    };
    
    fetchSurveillantType();
  }, [surveillantId]);

  // Séparer les créneaux par type
  const creneauxSurveillance = optimizedCreneaux.filter(slot => slot.type === 'surveillance');

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

  const weeklySurveillanceSlots = organizeByWeek(creneauxSurveillance);

  // Validation des disponibilités selon le type
  const validateAvailabilities = () => {
    const selectedCount = Object.keys(selectedSlots).length;
    
    if (surveillantType === 'Assistant' && selectedCount < 6) {
      return {
        isValid: false,
        message: "N'hésitez pas à maximiser vos disponibilités pour permettre de réaliser le planning.",
        type: 'warning' as const
      };
    }
    
    if (surveillantType === 'PAT FASB') {
      const minRequired = Math.ceil(creneauxSurveillance.length * 0.30) + 12;
      if (selectedCount < minRequired) {
        return {
          isValid: false,
          message: "Merci d'indiquer plus de disponibilités pour permettre l'attribution des surveillances.",
          type: 'error' as const
        };
      }
    }
    
    return { isValid: true, message: "", type: 'success' as const };
  };

  // Mutation pour sauvegarder les disponibilités
  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateAvailabilities();
      
      if (!validation.isValid && validation.type === 'error') {
        throw new Error(validation.message);
      }

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

      // Sauvegarder les remarques si présentes
      if (remarques.trim()) {
        const { data: surveillantData } = await supabase
          .from('surveillants')
          .select('nom, prenom')
          .eq('id', surveillantId)
          .single();

        const { error: commentError } = await supabase
          .from('commentaires_disponibilites')
          .insert({
            session_id: sessionId,
            surveillant_id: surveillantId,
            email: email,
            nom: surveillantData?.nom || '',
            prenom: surveillantData?.prenom || '',
            message: remarques.trim()
          });

        if (commentError) throw commentError;
      }
    },
    onSuccess: () => {
      const validation = validateAvailabilities();
      
      if (!validation.isValid && validation.type === 'warning') {
        toast({
          title: "Disponibilités enregistrées avec avertissement",
          description: validation.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Disponibilités enregistrées",
          description: "Vos disponibilités ont été enregistrées avec succès.",
        });
      }
      
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

  const validation = validateAvailabilities();
  const selectedCount = Object.keys(selectedSlots).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span>Déclarez vos disponibilités</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Sélectionnez les créneaux de surveillance où vous êtes disponible.
            {surveillantType && (
              <span className="block mt-1 font-medium text-blue-600">
                Profil : {surveillantType}
              </span>
            )}
          </p>
        </CardHeader>
      </Card>

      {/* Affichage des validations */}
      {selectedCount > 0 && !validation.isValid && (
        <Alert variant={validation.type === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {validation.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-green-800">
          <Users className="h-5 w-5" />
          <span className="font-medium">Créneaux de surveillance disponibles</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          Sélectionnez les créneaux où vous êtes disponible (incluant 45 min de préparation).
          {selectedCount > 0 && (
            <span className="block mt-1 font-medium">
              {selectedCount} créneau{selectedCount !== 1 ? 'x' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {Object.keys(weeklySurveillanceSlots).length === 0 ? (
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
          Object.entries(weeklySurveillanceSlots).map(([weekLabel, slots]) => (
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
                                {slot.heure_debut_surveillance && (
                                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                                    Surveillance dès {slot.heure_debut_surveillance}
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline">
                                {slot.examens.length} examen{slot.examens.length !== 1 ? 's' : ''}
                              </Badge>
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

        {/* Formulaire de remarques */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Remarques spécifiques</CardTitle>
            <p className="text-sm text-gray-600">
              Avez-vous des remarques particulières concernant vos disponibilités ?
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={remarques}
              onChange={(e) => setRemarques(e.target.value)}
              placeholder="Indiquez ici toute remarque spécifique concernant vos disponibilités, contraintes particulières, etc."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {Object.keys(weeklySurveillanceSlots).length > 0 && (
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
