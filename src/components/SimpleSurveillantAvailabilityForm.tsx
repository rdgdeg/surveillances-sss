
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface CreneauSurveillance {
  id: string;
  date_surveillance: string;
  heure_debut_surveillance: string;
  heure_fin_surveillance: string;
  examen_id: string;
  type_creneau: string;
  created_at: string;
}

interface SurveillantAvailability {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
}

export const SimpleSurveillantAvailabilityForm = ({ surveillant: initialSurveillant }: { surveillant?: Surveillant | undefined } = {}) => {
  const [email, setEmail] = useState("");
  const [surveillant, setSurveillant] = useState<Surveillant | undefined>(initialSurveillant);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; heure_debut: string; heure_fin: string; }[]>([]);
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

  const { data: slots = [] } = useQuery({
    queryKey: ['slots', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('creneaux_surveillance')
        .select('*')
        .eq('examen_id', activeSession.id);

      if (error) throw error;
      return data as CreneauSurveillance[];
    },
    enabled: !!activeSession?.id
  });

  useEffect(() => {
    if (slots && availabilities) {
      const initiallySelected = slots.filter(slot =>
        availabilities.some(avail =>
          avail.date_examen === slot.date_surveillance &&
          avail.heure_debut === slot.heure_debut_surveillance &&
          avail.heure_fin === slot.heure_fin_surveillance &&
          avail.est_disponible
        )
      ).map(slot => ({ date: slot.date_surveillance, heure_debut: slot.heure_debut_surveillance, heure_fin: slot.heure_fin_surveillance }));
      setSelectedSlots(initiallySelected);
    }
  }, [slots, availabilities]);

  const toggleSlot = (date: string, heure_debut: string, heure_fin: string) => {
    const slot = { date, heure_debut, heure_fin };
    const isSelected = selectedSlots.some(s =>
      s.date === slot.date && s.heure_debut === slot.heure_debut && s.heure_fin === slot.heure_fin
    );

    if (isSelected) {
      setSelectedSlots(prev => prev.filter(s =>
        !(s.date === slot.date && s.heure_debut === slot.heure_debut && s.heure_fin === slot.heure_fin)
      ));
    } else {
      setSelectedSlots(prev => [...prev, slot]);
    }
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

    const updates = slots.map(slot => {
      const isCurrentlyAvailable = availabilities.some(avail =>
        avail.date_examen === slot.date_surveillance &&
        avail.heure_debut === slot.heure_debut_surveillance &&
        avail.heure_fin === slot.heure_fin_surveillance &&
        avail.est_disponible
      );
      const shouldBeAvailable = selectedSlots.some(s =>
        s.date === slot.date_surveillance && s.heure_debut === slot.heure_debut_surveillance && s.heure_fin === slot.heure_fin_surveillance
      );

      return {
        date_examen: slot.date_surveillance,
        heure_debut: slot.heure_debut_surveillance,
        heure_fin: slot.heure_fin_surveillance,
        est_disponible: shouldBeAvailable,
        surveillant_id: surveillant.id,
        session_id: activeSession.id,
        id: availabilities.find(avail =>
          avail.date_examen === slot.date_surveillance &&
          avail.heure_debut === slot.heure_debut_surveillance &&
          avail.heure_fin === slot.heure_fin_surveillance
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
          .update({ est_disponible: update.est_disponible })
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
            session_id: activeSession.id
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
            {slots.length === 0 ? (
              <p>Aucune plage horaire disponible pour cette session.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => (
                  <div key={`${slot.date_surveillance}-${slot.heure_debut_surveillance}-${slot.heure_fin_surveillance}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`slot-${slot.date_surveillance}-${slot.heure_debut_surveillance}-${slot.heure_fin_surveillance}`}
                      checked={selectedSlots.some(s =>
                        s.date === slot.date_surveillance && s.heure_debut === slot.heure_debut_surveillance && s.heure_fin === slot.heure_fin_surveillance
                      )}
                      onCheckedChange={(checked) => {
                        toggleSlot(slot.date_surveillance, slot.heure_debut_surveillance, slot.heure_fin_surveillance);
                      }}
                    />
                    <label
                      htmlFor={`slot-${slot.date_surveillance}-${slot.heure_debut_surveillance}-${slot.heure_fin_surveillance}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {new Date(slot.date_surveillance).toLocaleDateString()} - {slot.heure_debut_surveillance} - {slot.heure_fin_surveillance}
                    </label>
                  </div>
                ))}
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
