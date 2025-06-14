
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";

interface Disponibilite {
  id: string;
  surveillant_id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
}

interface Surveillant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface TimeSlot {
  date: string;
  heure_debut: string;
  heure_fin: string;
  label: string;
}

export const AvailabilityMatrix = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});

  // Récupérer les surveillants
  const { data: surveillants = [] } = useQuery({
    queryKey: ['surveillants', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillants (
            id, nom, prenom, email, type
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data.map(item => item.surveillants).filter(Boolean) as Surveillant[];
    },
    enabled: !!activeSession
  });

  // Récupérer les créneaux d'examens uniques
  const { data: timeSlots = [] } = useQuery({
    queryKey: ['time-slots', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('date_examen, heure_debut, heure_fin')
        .eq('session_id', activeSession.id)
        .order('date_examen')
        .order('heure_debut');
      
      if (error) throw error;
      
      // Créer des créneaux uniques
      const uniqueSlots = new Map<string, TimeSlot>();
      
      data.forEach(exam => {
        const key = `${exam.date_examen}-${exam.heure_debut}-${exam.heure_fin}`;
        if (!uniqueSlots.has(key)) {
          uniqueSlots.set(key, {
            date: exam.date_examen,
            heure_debut: exam.heure_debut,
            heure_fin: exam.heure_fin,
            label: `${exam.date_examen} ${exam.heure_debut}-${exam.heure_fin}`
          });
        }
      });
      
      return Array.from(uniqueSlots.values());
    },
    enabled: !!activeSession
  });

  // Récupérer les disponibilités existantes
  const { data: disponibilites = [] } = useQuery({
    queryKey: ['disponibilites', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      
      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      return data as Disponibilite[];
    },
    enabled: !!activeSession
  });

  // Mutation pour sauvegarder les disponibilités
  const saveDisponibilitesMutation = useMutation({
    mutationFn: async (updates: Array<{
      surveillant_id: string;
      date_examen: string;
      heure_debut: string;
      heure_fin: string;
      est_disponible: boolean;
    }>) => {
      if (!activeSession) throw new Error('Aucune session active');

      // Supprimer les anciennes disponibilités pour cette session
      await supabase
        .from('disponibilites')
        .delete()
        .eq('session_id', activeSession.id);

      // Insérer les nouvelles disponibilités
      const { error } = await supabase
        .from('disponibilites')
        .insert(
          updates.map(update => ({
            ...update,
            session_id: activeSession.id
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilites'] });
      toast({
        title: "Disponibilités sauvegardées",
        description: "Les disponibilités ont été mises à jour avec succès."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les disponibilités.",
        variant: "destructive"
      });
    }
  });

  // Créer une map des disponibilités pour un accès rapide
  const disponibiliteMap = new Map<string, boolean>();
  disponibilites.forEach(disp => {
    const key = `${disp.surveillant_id}-${disp.date_examen}-${disp.heure_debut}-${disp.heure_fin}`;
    disponibiliteMap.set(key, disp.est_disponible);
  });

  const isAvailable = (surveillantId: string, slot: TimeSlot) => {
    const key = `${surveillantId}-${slot.date}-${slot.heure_debut}-${slot.heure_fin}`;
    return disponibiliteMap.get(key) || false;
  };

  const toggleAvailability = (surveillantId: string, slot: TimeSlot) => {
    const key = `${surveillantId}-${slot.date}-${slot.heure_debut}-${slot.heure_fin}`;
    const currentValue = disponibiliteMap.get(key) || false;
    disponibiliteMap.set(key, !currentValue);
    
    // Forcer le re-render
    setSelectedSlots(prev => ({ ...prev, [key]: !currentValue }));
  };

  const handleSave = () => {
    const updates: Array<{
      surveillant_id: string;
      date_examen: string;
      heure_debut: string;
      heure_fin: string;
      est_disponible: boolean;
    }> = [];

    surveillants.forEach(surveillant => {
      timeSlots.forEach(slot => {
        const key = `${surveillant.id}-${slot.date}-${slot.heure_debut}-${slot.heure_fin}`;
        const estDisponible = disponibiliteMap.get(key) || false;
        
        updates.push({
          surveillant_id: surveillant.id,
          date_examen: slot.date,
          heure_debut: slot.heure_debut,
          heure_fin: slot.heure_fin,
          est_disponible: estDisponible
        });
      });
    });

    saveDisponibilitesMutation.mutate(updates);
  };

  const generateCallyTemplate = () => {
    // Créer un template Excel-like pour Cally
    let csvContent = "Surveillant,Email,Type";
    timeSlots.forEach(slot => {
      csvContent += `,${slot.label}`;
    });
    csvContent += "\n";

    surveillants.forEach(surveillant => {
      csvContent += `${surveillant.prenom} ${surveillant.nom},${surveillant.email},${surveillant.type}`;
      timeSlots.forEach(slot => {
        const available = isAvailable(surveillant.id, slot);
        csvContent += `,${available ? '✓' : '✗'}`;
      });
      csvContent += "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cally_template_${activeSession?.name || 'session'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 text-uclouvain-blue-grey mx-auto mb-4" />
          <p className="text-uclouvain-blue">Aucune session active. Veuillez d'abord activer une session.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-uclouvain-blue-grey">
        <CardHeader className="bg-gradient-uclouvain text-white">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Matrice des Disponibilités - {activeSession.name}</span>
          </CardTitle>
          <CardDescription className="text-blue-100">
            Gérez les disponibilités des surveillants pour tous les créneaux d'examens. 
            Format compatible avec Cally (✓ = disponible, ✗ = non disponible).
          </CardDescription>
          <div className="flex space-x-2">
            <Button onClick={generateCallyTemplate} variant="outline" size="sm" className="bg-white text-uclouvain-blue border-white hover:bg-blue-50">
              <Download className="h-4 w-4 mr-2" />
              Télécharger template Cally
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveDisponibilitesMutation.isPending}
              className="bg-uclouvain-cyan text-uclouvain-blue hover:bg-blue-100"
            >
              Sauvegarder les disponibilités
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-uclouvain-blue-grey mx-auto mb-4" />
              <p className="text-uclouvain-blue">Aucun examen trouvé. Veuillez d'abord importer les examens.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-uclouvain-blue-grey">
                <thead>
                  <tr className="bg-uclouvain-blue-grey">
                    <th className="border border-uclouvain-blue-grey p-2 text-left font-medium text-uclouvain-blue">Surveillant</th>
                    <th className="border border-uclouvain-blue-grey p-2 text-left font-medium text-uclouvain-blue">Type</th>
                    {timeSlots.map((slot, index) => (
                      <th key={index} className="border border-uclouvain-blue-grey p-2 text-center font-medium min-w-24 text-uclouvain-blue">
                        <div className="text-xs">
                          <div>{slot.date}</div>
                          <div>{slot.heure_debut}-{slot.heure_fin}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surveillants.map((surveillant) => (
                    <tr key={surveillant.id} className="hover:bg-blue-50">
                      <td className="border border-uclouvain-blue-grey p-2">
                        <div>
                          <div className="font-medium text-uclouvain-blue">{surveillant.prenom} {surveillant.nom}</div>
                          <div className="text-sm text-uclouvain-blue-grey">{surveillant.email}</div>
                        </div>
                      </td>
                      <td className="border border-uclouvain-blue-grey p-2">
                        <Badge variant="outline" className="border-uclouvain-cyan text-uclouvain-blue">{surveillant.type}</Badge>
                      </td>
                      {timeSlots.map((slot, slotIndex) => {
                        const available = isAvailable(surveillant.id, slot);
                        return (
                          <td key={slotIndex} className="border border-uclouvain-blue-grey p-1 text-center">
                            <Button
                              variant={available ? "default" : "outline"}
                              size="sm"
                              className={`w-8 h-8 p-0 ${
                                available 
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'
                              }`}
                              onClick={() => toggleAvailability(surveillant.id, slot)}
                            >
                              {available ? '✓' : '✗'}
                            </Button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
