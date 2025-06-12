
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Building } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoomConstraint {
  id: string;
  salle: string;
  min_non_jobistes: number;
}

export const RoomConstraintsManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [minNonJobistes, setMinNonJobistes] = useState<number>(1);

  // Récupérer les salles d'examen de la session
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('salle')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      
      // Récupérer les salles uniques
      const uniqueRooms = [...new Set(data.map(item => item.salle))];
      return uniqueRooms.sort();
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les contraintes existantes
  const { data: constraints = [] } = useQuery({
    queryKey: ['room-constraints', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('contraintes_salles')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('salle');
      
      if (error) throw error;
      return data as RoomConstraint[];
    },
    enabled: !!activeSession?.id
  });

  // Créer une contrainte
  const createConstraint = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id || !selectedRoom) {
        throw new Error("Veuillez sélectionner une salle");
      }

      const { data, error } = await supabase
        .from('contraintes_salles')
        .insert({
          session_id: activeSession.id,
          salle: selectedRoom,
          min_non_jobistes: minNonJobistes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-constraints'] });
      setSelectedRoom("");
      setMinNonJobistes(1);
      toast({
        title: "Contrainte créée",
        description: "La contrainte de salle a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la contrainte.",
        variant: "destructive"
      });
    }
  });

  // Supprimer une contrainte
  const deleteConstraint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contraintes_salles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-constraints'] });
      toast({
        title: "Contrainte supprimée",
        description: "La contrainte a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la contrainte.",
        variant: "destructive"
      });
    }
  });

  // Mettre à jour une contrainte
  const updateConstraint = useMutation({
    mutationFn: async ({ id, min_non_jobistes }: { id: string; min_non_jobistes: number }) => {
      const { error } = await supabase
        .from('contraintes_salles')
        .update({ min_non_jobistes })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-constraints'] });
      toast({
        title: "Contrainte mise à jour",
        description: "La contrainte a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la contrainte.",
        variant: "destructive"
      });
    }
  });

  const availableRooms = rooms.filter(room => 
    !constraints.some(constraint => constraint.salle === room)
  );

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active dans l'onglet Sessions.
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
            <Building className="h-5 w-5" />
            <span>Contraintes par Salle</span>
          </CardTitle>
          <CardDescription>
            Définissez le nombre minimum de surveillants non-jobistes requis par salle.
            Par défaut, chaque salle nécessite au moins 1 surveillant non-jobiste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Salle</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une salle" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Min. non-jobistes</label>
              <Input
                type="number"
                min="0"
                max="10"
                value={minNonJobistes}
                onChange={(e) => setMinNonJobistes(parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => createConstraint.mutate()}
                disabled={!selectedRoom || createConstraint.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>

          {/* Liste des contraintes */}
          <div className="space-y-2">
            <h4 className="font-medium">Contraintes configurées ({constraints.length})</h4>
            {constraints.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucune contrainte spécifique définie. La règle par défaut (1 non-jobiste minimum) s'applique à toutes les salles.
              </p>
            ) : (
              <div className="space-y-2">
                {constraints.map((constraint) => (
                  <div key={constraint.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{constraint.salle}</div>
                      <div className="text-sm text-gray-600">
                        Minimum {constraint.min_non_jobistes} surveillant(s) non-jobiste(s)
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={constraint.min_non_jobistes}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          updateConstraint.mutate({ 
                            id: constraint.id, 
                            min_non_jobistes: newValue 
                          });
                        }}
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConstraint.mutate(constraint.id)}
                        disabled={deleteConstraint.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information sur les salles sans contrainte */}
          {availableRooms.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-sm mb-2">Salles avec règle par défaut (1 non-jobiste min.)</h5>
              <div className="flex flex-wrap gap-1">
                {availableRooms.map((room) => (
                  <Badge key={room} variant="outline" className="text-xs">
                    {room}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
