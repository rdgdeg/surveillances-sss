
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { Calendar, Clock, Send, RefreshCw } from "lucide-react";

interface ExamSlot {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
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

export const SimpleSurveillantAvailabilityForm = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [surveillantId, setSurveillantId] = useState<string | null>(null);
  const [availabilities, setAvailabilities] = useState<Record<string, DisponibiliteForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Récupérer les créneaux d'examens
  const { data: examSlots = [] } = useQuery({
    queryKey: ['exam-slots', activeSession?.id],
    queryFn: async (): Promise<ExamSlot[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les disponibilités existantes
  const { data: existingDisponibilites, refetch: refetchDisponibilites } = useQuery({
    queryKey: ['surveillant-disponibilites', surveillantId, activeSession?.id],
    queryFn: async () => {
      if (!surveillantId || !activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!surveillantId && !!activeSession?.id
  });

  // Rechercher le surveillant par email
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('surveillants')
      .select('id, nom, prenom')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error) {
      toast({
        title: "Surveillant non trouvé",
        description: "Aucun surveillant trouvé avec cette adresse email.",
        variant: "destructive"
      });
      return;
    }

    setSurveillantId(data.id);
    toast({
      title: "Surveillant trouvé",
      description: `Bonjour ${data.prenom} ${data.nom}`,
    });
  };

  // Charger les disponibilités existantes dans le formulaire
  useEffect(() => {
    if (existingDisponibilites && existingDisponibilites.length > 0) {
      const newAvailabilities: Record<string, DisponibiliteForm> = {};
      
      existingDisponibilites.forEach(dispo => {
        const key = `${dispo.date_examen}-${dispo.heure_debut}-${dispo.heure_fin}`;
        
        // S'assurer que type_choix est du bon type
        const typeChoix = dispo.type_choix === 'obligatoire' ? 'obligatoire' : 'souhaitee';
        
        newAvailabilities[key] = {
          date_examen: dispo.date_examen,
          heure_debut: dispo.heure_debut,
          heure_fin: dispo.heure_fin,
          est_disponible: dispo.est_disponible,
          type_choix: typeChoix,
          nom_examen_selectionne: dispo.nom_examen_selectionne || '',
          nom_examen_obligatoire: dispo.nom_examen_obligatoire || '',
          commentaire_surveillance_obligatoire: dispo.commentaire_surveillance_obligatoire || ''
        };
      });
      
      setAvailabilities(newAvailabilities);
      
      toast({
        title: "Disponibilités chargées",
        description: `${existingDisponibilites.length} disponibilité(s) existante(s) chargée(s).`,
      });
    }
  }, [existingDisponibilites]);

  // Mutation pour sauvegarder
  const saveDisponibilitesMutation = useMutation({
    mutationFn: async () => {
      if (!surveillantId || !activeSession?.id) throw new Error('Données manquantes');

      const availabilityList = Object.values(availabilities).filter(av => av.est_disponible);

      if (availabilityList.length === 0) {
        throw new Error('Veuillez sélectionner au moins une disponibilité');
      }

      // Supprimer les anciennes disponibilités
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);

      // Insérer les nouvelles
      const { error } = await supabase
        .from('disponibilites')
        .insert(
          availabilityList.map(av => ({
            surveillant_id: surveillantId,
            session_id: activeSession.id,
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
      refetchDisponibilites();
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

  const toggleAvailability = (slot: ExamSlot) => {
    const slotKey = `${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`;
    const currentAvailability = availabilities[slotKey];
    
    if (currentAvailability?.est_disponible) {
      // Désactiver
      setAvailabilities(prev => {
        const newState = { ...prev };
        delete newState[slotKey];
        return newState;
      });
    } else {
      // Activer
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

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Veuillez contacter l'administration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Déclaration de disponibilités - {activeSession.name}</span>
          </CardTitle>
          <CardDescription>
            Indiquez vos disponibilités pour surveiller les examens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!surveillantId ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Votre adresse email</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@uclouvain.be"
                    className="flex-1"
                  />
                  <Button onClick={handleEmailSubmit}>
                    Valider
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Email confirmé :</span>
                  <span className="font-medium">{email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSurveillantId(null);
                    setEmail("");
                    setAvailabilities({});
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Changer
                </Button>
              </div>

              {examSlots.length === 0 ? (
                <p className="text-center text-gray-500">
                  Aucun examen trouvé pour cette session.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {examSlots.map((slot) => {
                      const slotKey = `${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`;
                      const availability = availabilities[slotKey];
                      const isAvailable = availability?.est_disponible || false;

                      return (
                        <Card key={slot.id} className={`border ${isAvailable ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
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
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 mb-3">
                                  <strong>{slot.matiere}</strong> • {slot.salle}
                                </div>

                                {isAvailable && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-white rounded border">
                                    <div>
                                      <Label className="text-sm">Type de disponibilité</Label>
                                      <Select
                                        value={availability.type_choix}
                                        onValueChange={(value: 'souhaitee' | 'obligatoire') => handleAvailabilityChange(slotKey, 'type_choix', value)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="souhaitee">Souhaitée</SelectItem>
                                          <SelectItem value="obligatoire">Obligatoire</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label className="text-sm">Code examen spécifique (optionnel)</Label>
                                      <Input
                                        value={availability.nom_examen_selectionne || ''}
                                        onChange={(e) => handleAvailabilityChange(slotKey, 'nom_examen_selectionne', e.target.value)}
                                        placeholder="Ex: LECON2100"
                                        className="mt-1"
                                      />
                                    </div>

                                    {availability.type_choix === 'obligatoire' && (
                                      <>
                                        <div className="md:col-span-2">
                                          <Label className="text-sm">Nom de l'examen obligatoire</Label>
                                          <Input
                                            value={availability.nom_examen_obligatoire || ''}
                                            onChange={(e) => handleAvailabilityChange(slotKey, 'nom_examen_obligatoire', e.target.value)}
                                            placeholder="Nom complet de l'examen"
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="md:col-span-2">
                                          <Label className="text-sm">Commentaire (optionnel)</Label>
                                          <Textarea
                                            value={availability.commentaire_surveillance_obligatoire || ''}
                                            onChange={(e) => handleAvailabilityChange(slotKey, 'commentaire_surveillance_obligatoire', e.target.value)}
                                            placeholder="Précisions sur cette surveillance obligatoire..."
                                            className="mt-1"
                                            rows={2}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || Object.values(availabilities).filter(av => av.est_disponible).length === 0}
                      className="flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isSubmitting ? 'Sauvegarde...' : 'Envoyer mes disponibilités'}</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
