
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  nombre_surveillants: number;
  type_requis: string;
}

interface PreAssignment {
  id: string;
  examen_id: string;
  surveillant_id: string;
  is_obligatoire: boolean;
  surveillant: Surveillant;
  examen: Examen;
}

export const PreAssignmentManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedExamen, setSelectedExamen] = useState<string>("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<string>("");

  // Récupérer les surveillants actifs
  const { data: surveillants = [] } = useQuery({
    queryKey: ['surveillants', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          surveillant:surveillants(id, nom, prenom, email, type)
        `)
        .eq('session_id', activeSession.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data.map(item => item.surveillant).filter(Boolean) as Surveillant[];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les examens
  const { data: examens = [] } = useQuery({
    queryKey: ['examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });
      
      if (error) throw error;
      return data as Examen[];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les pré-assignations existantes
  const { data: preAssignments = [] } = useQuery({
    queryKey: ['pre-assignments', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('attributions')
        .select(`
          *,
          surveillant:surveillants(*),
          examen:examens(*)
        `)
        .eq('session_id', activeSession.id)
        .eq('is_obligatoire', true);
      
      if (error) throw error;
      return data as PreAssignment[];
    },
    enabled: !!activeSession?.id
  });

  // Créer une pré-assignation obligatoire
  const createPreAssignment = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id || !selectedExamen || !selectedSurveillant) {
        throw new Error("Veuillez sélectionner un examen et un surveillant");
      }

      const { data, error } = await supabase
        .from('attributions')
        .insert({
          session_id: activeSession.id,
          examen_id: selectedExamen,
          surveillant_id: selectedSurveillant,
          is_obligatoire: true,
          is_pre_assigne: true,
          is_locked: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-assignments'] });
      setSelectedExamen("");
      setSelectedSurveillant("");
      toast({
        title: "Pré-assignation créée",
        description: "La pré-assignation obligatoire a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la pré-assignation.",
        variant: "destructive"
      });
    }
  });

  // Supprimer une pré-assignation
  const deletePreAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attributions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-assignments'] });
      toast({
        title: "Pré-assignation supprimée",
        description: "La pré-assignation a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la pré-assignation.",
        variant: "destructive"
      });
    }
  });

  const formatExamenLabel = (examen: Examen) => {
    const date = new Date(examen.date_examen).toLocaleDateString('fr-FR');
    return `${date} ${examen.heure_debut}-${examen.heure_fin} | ${examen.matiere} | ${examen.salle}`;
  };

  const formatSurveillantLabel = (surveillant: Surveillant) => {
    return `${surveillant.nom} ${surveillant.prenom} (${surveillant.type})`;
  };

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
            <Lock className="h-5 w-5" />
            <span>Pré-assignations Obligatoires</span>
          </CardTitle>
          <CardDescription>
            Définissez les surveillants qui doivent absolument surveiller certains examens.
            Ces assignations ne seront pas modifiées par le moteur automatique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Examen</label>
              <Select value={selectedExamen} onValueChange={setSelectedExamen}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un examen" />
                </SelectTrigger>
                <SelectContent>
                  {examens.map((examen) => (
                    <SelectItem key={examen.id} value={examen.id}>
                      {formatExamenLabel(examen)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Surveillant</label>
              <Select value={selectedSurveillant} onValueChange={setSelectedSurveillant}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un surveillant" />
                </SelectTrigger>
                <SelectContent>
                  {surveillants.map((surveillant) => (
                    <SelectItem key={surveillant.id} value={surveillant.id}>
                      {formatSurveillantLabel(surveillant)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => createPreAssignment.mutate()}
                disabled={!selectedExamen || !selectedSurveillant || createPreAssignment.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>

          {/* Liste des pré-assignations */}
          <div className="space-y-2">
            <h4 className="font-medium">Pré-assignations existantes ({preAssignments.length})</h4>
            {preAssignments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucune pré-assignation obligatoire définie.
              </p>
            ) : (
              <div className="space-y-2">
                {preAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {formatSurveillantLabel(assignment.surveillant)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatExamenLabel(assignment.examen)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <Lock className="h-3 w-3 mr-1" />
                        Obligatoire
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreAssignment.mutate(assignment.id)}
                        disabled={deletePreAssignment.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
