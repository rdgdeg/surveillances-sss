import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";

interface SurveillantStats {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
}

interface ExamenCreneau {
  id: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  faculte: string;
}

interface DisponibiliteExistante {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  est_disponible: boolean;
  type_choix: string;
  nom_examen_selectionne?: string;
  nom_examen_obligatoire?: string;
  commentaire_surveillance_obligatoire?: string;
}

interface EditDisponibilitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveillant: SurveillantStats | null;
}

export const EditDisponibilitesModal = ({ isOpen, onClose, surveillant }: EditDisponibilitesModalProps) => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedDisponibilites, setSelectedDisponibilites] = useState<Record<string, boolean>>({});

  // Récupérer tous les examens de la session
  const { data: examens = [] } = useQuery({
    queryKey: ['examens-session', activeSession?.id],
    queryFn: async (): Promise<ExamenCreneau[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, matiere, date_examen, heure_debut, heure_fin, salle, faculte')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id && !!surveillant?.id
  });

  // Récupérer les disponibilités existantes du surveillant
  const { data: disponibilitesExistantes = [] } = useQuery({
    queryKey: ['disponibilites-surveillant', surveillant?.id, activeSession?.id],
    queryFn: async (): Promise<DisponibiliteExistante[]> => {
      if (!surveillant?.id || !activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', surveillant.id)
        .eq('session_id', activeSession.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!surveillant?.id && !!activeSession?.id
  });

  // Initialiser les disponibilités sélectionnées
  useEffect(() => {
    if (disponibilitesExistantes.length > 0 && examens.length > 0) {
      const initialSelected: Record<string, boolean> = {};
      
      examens.forEach(examen => {
        const dispo = disponibilitesExistantes.find(d => 
          d.date_examen === examen.date_examen &&
          d.heure_debut === examen.heure_debut &&
          d.heure_fin === examen.heure_fin
        );
        initialSelected[examen.id] = dispo?.est_disponible || false;
      });
      
      setSelectedDisponibilites(initialSelected);
    }
  }, [disponibilitesExistantes, examens]);

  // Mutation pour sauvegarder les modifications
  const saveDisponibilitesMutation = useMutation({
    mutationFn: async () => {
      if (!surveillant?.id || !activeSession?.id) return;

      // Supprimer toutes les disponibilités existantes
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillant.id)
        .eq('session_id', activeSession.id);

      // Insérer les nouvelles disponibilités
      const nouvelles = Object.entries(selectedDisponibilites)
        .filter(([_, isSelected]) => isSelected)
        .map(([examenId, _]) => {
          const examen = examens.find(e => e.id === examenId);
          if (!examen) return null;

          return {
            surveillant_id: surveillant.id,
            session_id: activeSession.id,
            date_examen: examen.date_examen,
            heure_debut: examen.heure_debut,
            heure_fin: examen.heure_fin,
            est_disponible: true,
            type_choix: 'souhaitee'
          };
        })
        .filter(Boolean);

      if (nouvelles.length > 0) {
        const { error } = await supabase
          .from('disponibilites')
          .insert(nouvelles);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillants-stats'] });
      queryClient.invalidateQueries({ queryKey: ['disponibilites-detail'] });
      toast({
        title: "Disponibilités mises à jour",
        description: `Les disponibilités de ${surveillant?.prenom} ${surveillant?.nom} ont été modifiées.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  });

  const handleDisponibiliteChange = (examenId: string, checked: boolean) => {
    setSelectedDisponibilites(prev => ({
      ...prev,
      [examenId]: checked
    }));
  };

  const selectedCount = Object.values(selectedDisponibilites).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Modifier les disponibilités</span>
          </DialogTitle>
          <DialogDescription>
            {surveillant ? `${surveillant.prenom} ${surveillant.nom} (${surveillant.email})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {selectedCount} créneau{selectedCount !== 1 ? 'x' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
            </Badge>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button 
                onClick={() => saveDisponibilitesMutation.mutate()}
                disabled={saveDisponibilitesMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveDisponibilitesMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Créneaux d'examens disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              {examens.length === 0 ? (
                <p className="text-center text-gray-500">Aucun examen validé dans cette session.</p>
              ) : (
                <div className="space-y-3">
                  {examens.map((examen) => (
                    <div
                      key={examen.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`examen-${examen.id}`}
                        checked={selectedDisponibilites[examen.id] || false}
                        onCheckedChange={(checked) => 
                          handleDisponibiliteChange(examen.id, !!checked)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`examen-${examen.id}`}
                          className="block cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 mb-1">
                            <Badge variant="outline">
                              {formatDateWithDayBelgian(examen.date_examen)}
                            </Badge>
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{examen.heure_debut} - {examen.heure_fin}</span>
                            </Badge>
                            {examen.faculte && (
                              <Badge variant="secondary">{examen.faculte}</Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm">
                            {examen.matiere}
                          </h4>
                          <p className="text-xs text-gray-600">
                            Salle : {examen.salle}
                          </p>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
