import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface Availability {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
}

interface SurveillantAvailability {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
}

export const SimpleSurveillantAvailabilityForm = ({ surveillant }: { surveillant: Surveillant | undefined }) => {
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; heure_debut: string; heure_fin: string; }[]>([]);
  const { data: activeSession } = useActiveSession();

  const { data: availabilities = [], isLoading } = useQuery({
    queryKey: ['availabilities', activeSession?.id, surveillant?.id],
    queryFn: async () => {
      if (!activeSession?.id || !surveillant?.id) return [];

      const { data, error } = await supabase
        .from('surveillant_disponibilites')
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
        .from('slots_examen')
        .select('*')
        .eq('session_id', activeSession.id);

      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!activeSession?.id
  });

  useEffect(() => {
    if (slots && availabilities) {
      const initiallySelected = slots.filter(slot =>
        availabilities.some(avail =>
          avail.date_examen === slot.date_examen &&
          avail.heure_debut === slot.heure_debut &&
          avail.heure_fin === slot.heure_fin &&
          avail.est_disponible
        )
      ).map(slot => ({ date: slot.date_examen, heure_debut: slot.heure_debut, heure_fin: slot.heure_fin }));
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
      const selectedCount = selectedSlots.filter(slot => 
        availabilities.some(avail => 
          avail.date_examen === slot.date_examen &&
          avail.heure_debut === slot.heure_debut &&
          avail.heure_fin === slot.heure_fin &&
          avail.est_disponible
        )
      ).length;
      
      if (selectedCount < 15) {
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
        avail.date_examen === slot.date_examen &&
        avail.heure_debut === slot.heure_debut &&
        avail.heure_fin === slot.heure_fin &&
        avail.est_disponible
      );
      const shouldBeAvailable = selectedSlots.some(s =>
        s.date === slot.date_examen && s.heure_debut === slot.heure_debut && s.heure_fin === slot.heure_fin
      );

      return {
        date_examen: slot.date_examen,
        heure_debut: slot.heure_debut,
        heure_fin: slot.heure_fin,
        est_disponible: shouldBeAvailable,
        surveillant_id: surveillant.id,
        session_id: activeSession.id,
        id: availabilities.find(avail =>
          avail.date_examen === slot.date_examen &&
          avail.heure_debut === slot.heure_debut &&
          avail.heure_fin === slot.heure_fin
        )?.id
      };
    });

    // Optimistic update
    // queryClient.setQueryData(['availabilities', activeSession.id, surveillant.id], (old: SurveillantAvailability[] | undefined) => {
    //   return updates.filter(update => update.est_disponible).map(update => ({
    //     date_examen: update.date_examen,
    //     heure_debut: update.heure_debut,
    //     heure_fin: update.heure_fin,
    //     est_disponible: update.est_disponible,
    //     surveillant_id: surveillant.id,
    //     session_id: activeSession.id,
    //   }))
    // });

    await Promise.all(updates.map(async update => {
      const existingAvailability = availabilities.find(avail =>
        avail.date_examen === update.date_examen &&
        avail.heure_debut === update.heure_debut &&
        avail.heure_fin === update.heure_fin
      );

      if (existingAvailability) {
        // Update existing availability
        const { error } = await supabase
          .from('surveillant_disponibilites')
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
          .from('surveillant_disponibilites')
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
        <CardDescription>Sélectionnez les plages horaires où vous êtes disponible.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {slots.length === 0 ? (
            <p>Aucune plage horaire disponible pour cette session.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map(slot => (
                <div key={`${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`slot-${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`}
                    checked={selectedSlots.some(s =>
                      s.date === slot.date_examen && s.heure_debut === slot.heure_debut && s.heure_fin === slot.heure_fin
                    )}
                    onCheckedChange={(checked) => {
                      toggleSlot(slot.date_examen, slot.heure_debut, slot.heure_fin);
                    }}
                  />
                  <label
                    htmlFor={`slot-${slot.date_examen}-${slot.heure_debut}-${slot.heure_fin}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {new Date(slot.date_examen).toLocaleDateString()} - {slot.heure_debut} - {slot.heure_fin}
                  </label>
                </div>
              ))}
            </div>
          )}
          <Button type="submit">
            Sauvegarder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
