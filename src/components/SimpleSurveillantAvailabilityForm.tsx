
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Label } from "@/components/ui/label";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface Examen {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  code_examen: string;
}

interface SurveillantAvailability {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix?: string;
  nom_examen_selectionne?: string;
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

interface SelectedSlot {
  date: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: 'souhaitee' | 'obligatoire';
  nom_examen_selectionne?: string;
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

export const SimpleSurveillantAvailabilityForm = ({ surveillant: initialSurveillant }: { surveillant?: Surveillant | undefined } = {}) => {
  const [email, setEmail] = useState("");
  const [surveillant, setSurveillant] = useState<Surveillant | undefined>(initialSurveillant);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const { data: activeSession } = useActiveSession();

  // Rechercher le surveillant par email
  const { data: foundSurveillant, isLoading: searchLoading } = useQuery({
    queryKey: ['searchSurveillant', email],
    queryFn: async () => {
      if (!email.includes('@')) return null;
      
      const { data, error } = await supabase
        .from('surveillants')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!email && email.includes('@') && !initialSurveillant
  });

  // Mettre à jour le surveillant quand on le trouve
  useEffect(() => {
    if (foundSurveillant) {
      setSurveillant(foundSurveillant);
    } else if (email && email.includes('@') && !foundSurveillant && !searchLoading) {
      setSurveillant(undefined);
    }
  }, [foundSurveillant, email, searchLoading]);

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['availabilities', activeSession?.id, surveillant?.id],
    queryFn: async () => {
      if (!activeSession?.id || !surveillant?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('surveillant_id', surveillant.id);

      if (error) throw error;
      return data as SurveillantAvailability[];
    },
    enabled: !!activeSession?.id && !!surveillant?.id
  });

  // Récupérer les examens de la session active
  const { data: examens = [] } = useQuery({
    queryKey: ['examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;
      return data as Examen[];
    },
    enabled: !!activeSession?.id
  });

  useEffect(() => {
    if (examens && availabilities) {
      const initiallySelected = examens.filter(examen =>
        availabilities.some(avail =>
          avail.date_examen === examen.date_examen &&
          avail.heure_debut === examen.heure_debut &&
          avail.heure_fin === examen.heure_fin &&
          avail.est_disponible
        )
      ).map(examen => {
        const availability = availabilities.find(avail =>
          avail.date_examen === examen.date_examen &&
          avail.heure_debut === examen.heure_debut &&
          avail.heure_fin === examen.heure_fin
        );
        
        return {
          date: examen.date_examen,
          heure_debut: examen.heure_debut,
          heure_fin: examen.heure_fin,
          type_choix: (availability?.type_choix as 'souhaitee' | 'obligatoire') || 'souhaitee',
          nom_examen_selectionne: availability?.nom_examen_selectionne,
          nom_examen_obligatoire: availability?.nom_examen_obligatoire,
          commentaire_surveillance_obligatoire: availability?.commentaire_surveillance_obligatoire
        };
      });
      setSelectedSlots(initiallySelected);
    }
  }, [examens, availabilities]);

  const toggleSlot = (date: string, heure_debut: string, heure_fin: string) => {
    const slotKey = `${date}-${heure_debut}-${heure_fin}`;
    const isSelected = selectedSlots.some(s =>
      s.date === date && s.heure_debut === heure_debut && s.heure_fin === heure_fin
    );

    if (isSelected) {
      setSelectedSlots(prev => prev.filter(s =>
        !(s.date === date && s.heure_debut === heure_debut && s.heure_fin === heure_fin)
      ));
    } else {
      setSelectedSlots(prev => [...prev, {
        date,
        heure_debut,
        heure_fin,
        type_choix: 'souhaitee'
      }]);
    }
  };

  const updateSlotType = (date: string, heure_debut: string, heure_fin: string, type_choix: 'souhaitee' | 'obligatoire') => {
    setSelectedSlots(prev => prev.map(slot =>
      slot.date === date && slot.heure_debut === heure_debut && slot.heure_fin === heure_fin
        ? { ...slot, type_choix }
        : slot
    ));
  };

  const updateSlotComment = (date: string, heure_debut: string, heure_fin: string, field: string, value: string) => {
    setSelectedSlots(prev => prev.map(slot =>
      slot.date === date && slot.heure_debut === heure_debut && slot.heure_fin === heure_fin
        ? { ...slot, [field]: value }
        : slot
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!surveillant || !activeSession) return;

    // Validation spéciale pour PAT FASB
    if (surveillant.type === 'PAT FASB') {
      if (selectedSlots.length < 15) {
        toast({
          title: "Erreur de validation",
          description: "Les PAT FASB doivent sélectionner au moins 15 disponibilités.",
          variant: "destructive"
        });
        return;
      }
    }

    const updates = examens.map(examen => {
      const isCurrentlyAvailable = availabilities.some(avail =>
        avail.date_examen === examen.date_examen &&
        avail.heure_debut === examen.heure_debut &&
        avail.heure_fin === examen.heure_fin &&
        avail.est_disponible
      );
      
      const selectedSlot = selectedSlots.find(s =>
        s.date === examen.date_examen && 
        s.heure_debut === examen.heure_debut && 
        s.heure_fin === examen.heure_fin
      );
      
      const shouldBeAvailable = !!selectedSlot;

      return {
        date_examen: examen.date_examen,
        heure_debut: examen.heure_debut,
        heure_fin: examen.heure_fin,
        est_disponible: shouldBeAvailable,
        surveillant_id: surveillant.id,
        session_id: activeSession.id,
        type_choix: selectedSlot?.type_choix || 'souhaitee',
        nom_examen_selectionne: selectedSlot?.nom_examen_selectionne,
        nom_examen_obligatoire: selectedSlot?.nom_examen_obligatoire,
        commentaire_surveillance_obligatoire: selectedSlot?.commentaire_surveillance_obligatoire,
        id: availabilities.find(avail =>
          avail.date_examen === examen.date_examen &&
          avail.heure_debut === examen.heure_debut &&
          avail.heure_fin === examen.heure_fin
        )?.id
      };
    });

    await Promise.all(updates.map(async update => {
      const existingAvailability = availabilities.find(avail =>
        avail.date_examen === update.date_examen &&
        avail.heure_debut === update.heure_debut &&
        avail.heure_fin === update.heure_fin
      );

      if (existingAvailability) {
        // Update existing availability
        const { error } = await supabase
          .from('disponibilites')
          .update({
            est_disponible: update.est_disponible,
            type_choix: update.type_choix,
            nom_examen_selectionne: update.nom_examen_selectionne,
            nom_examen_obligatoire: update.nom_examen_obligatoire,
            commentaire_surveillance_obligatoire: update.commentaire_surveillance_obligatoire
          })
          .eq('id', existingAvailability.id);

        if (error) {
          console.error("Update error", error);
          toast({
            title: "Erreur",
            description: `Impossible de mettre à jour la disponibilité pour ${update.date_examen} ${update.heure_debut}-${update.heure_fin}.`,
            variant: "destructive"
          });
        }
      } else if (update.est_disponible) {
        // Create new availability
        const { error } = await supabase
          .from('disponibilites')
          .insert({
            date_examen: update.date_examen,
            heure_debut: update.heure_debut,
            heure_fin: update.heure_fin,
            est_disponible: update.est_disponible,
            surveillant_id: surveillant.id,
            session_id: activeSession.id,
            type_choix: update.type_choix,
            nom_examen_selectionne: update.nom_examen_selectionne,
            nom_examen_obligatoire: update.nom_examen_obligatoire,
            commentaire_surveillance_obligatoire: update.commentaire_surveillance_obligatoire
          });

        if (error) {
          console.error("Insert error", error);
          toast({
            title: "Erreur",
            description: `Impossible d'ajouter la disponibilité pour ${update.date_examen} ${update.heure_debut}-${update.heure_fin}.`,
            variant: "destructive"
          });
        }
      }
    }));

    toast({
      title: "Disponibilités mises à jour",
      description: "Les disponibilités ont été sauvegardées.",
    });
  };

  if (isLoading) {
    return <CardContent>Chargement des disponibilités...</CardContent>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Disponibilités</CardTitle>
        <CardDescription>
          {!initialSurveillant ? "Saisissez votre email pour charger vos disponibilités." : "Sélectionnez les plages horaires où vous êtes disponible."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!initialSurveillant && (
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email UCLouvain
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@uclouvain.be"
                className="mb-4"
              />
            </div>
            
            {email && email.includes('@') && !surveillant && !searchLoading && (
              <div className="text-red-600 text-sm">
                Aucun surveillant trouvé avec cet email.
              </div>
            )}
            
            {surveillant && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">
                  {surveillant.prenom} {surveillant.nom}
                </h3>
                <p className="text-sm text-blue-700">
                  Type: {surveillant.type} | Email: {surveillant.email}
                </p>
              </div>
            )}
          </div>
        )}

        {(surveillant || initialSurveillant) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {examens.length === 0 ? (
              <p>Aucun examen disponible pour cette session.</p>
            ) : (
              <div className="space-y-4">
                {examens.map(examen => {
                  const selectedSlot = selectedSlots.find(s =>
                    s.date === examen.date_examen && 
                    s.heure_debut === examen.heure_debut && 
                    s.heure_fin === examen.heure_fin
                  );
                  const isSelected = !!selectedSlot;
                  
                  return (
                    <div key={`${examen.date_examen}-${examen.heure_debut}-${examen.heure_fin}-${examen.id}`} 
                         className="border p-4 rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`slot-${examen.id}`}
                          checked={isSelected}
                          onCheckedChange={() => {
                            toggleSlot(examen.date_examen, examen.heure_debut, examen.heure_fin);
                          }}
                        />
                        <label
                          htmlFor={`slot-${examen.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {new Date(examen.date_examen).toLocaleDateString()} - {examen.heure_debut} - {examen.heure_fin}
                        </label>
                      </div>
                      
                      <div className="text-sm text-gray-600 ml-6">
                        <p><strong>Matière:</strong> {examen.matiere}</p>
                        <p><strong>Salle:</strong> {examen.salle}</p>
                        {examen.code_examen && <p><strong>Code:</strong> {examen.code_examen}</p>}
                      </div>

                      {isSelected && (
                        <div className="ml-6 space-y-3 bg-gray-50 p-3 rounded">
                          <div className="flex items-center space-x-4">
                            <Label className="text-sm font-medium">Type de disponibilité:</Label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`souhaitee-${examen.id}`}
                                name={`type-${examen.id}`}
                                checked={selectedSlot?.type_choix === 'souhaitee'}
                                onChange={() => updateSlotType(examen.date_examen, examen.heure_debut, examen.heure_fin, 'souhaitee')}
                              />
                              <Label htmlFor={`souhaitee-${examen.id}`} className="text-sm">Souhaitée</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`obligatoire-${examen.id}`}
                                name={`type-${examen.id}`}
                                checked={selectedSlot?.type_choix === 'obligatoire'}
                                onChange={() => updateSlotType(examen.date_examen, examen.heure_debut, examen.heure_fin, 'obligatoire')}
                              />
                              <Label htmlFor={`obligatoire-${examen.id}`} className="text-sm">Obligatoire</Label>
                            </div>
                          </div>

                          {selectedSlot?.type_choix === 'obligatoire' && (
                            <div className="space-y-2">
                              <div>
                                <Label htmlFor={`nom-examen-${examen.id}`} className="text-sm">Nom de l'examen obligatoire:</Label>
                                <Input
                                  id={`nom-examen-${examen.id}`}
                                  value={selectedSlot?.nom_examen_obligatoire || ''}
                                  onChange={(e) => updateSlotComment(examen.date_examen, examen.heure_debut, examen.heure_fin, 'nom_examen_obligatoire', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`commentaire-${examen.id}`} className="text-sm">Commentaire:</Label>
                                <Input
                                  id={`commentaire-${examen.id}`}
                                  value={selectedSlot?.commentaire_surveillance_obligatoire || ''}
                                  onChange={(e) => updateSlotComment(examen.date_examen, examen.heure_debut, examen.heure_fin, 'commentaire_surveillance_obligatoire', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Button type="submit">
              Sauvegarder
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
