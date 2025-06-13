import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Lock, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";

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
  code_examen?: string;
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
  const [surveillantSearch, setSurveillantSearch] = useState<string>("");
  const [examenSearch, setExamenSearch] = useState<string>("");

  // Récupérer les surveillants actifs de la session
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
      const result = data.map(item => item.surveillant).filter(Boolean) as Surveillant[];
      // Trier par ordre alphabétique (nom, puis prénom)
      return result.sort((a, b) => {
        const nameCompare = a.nom.localeCompare(b.nom);
        if (nameCompare === 0) {
          return a.prenom.localeCompare(b.prenom);
        }
        return nameCompare;
      });
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les examens de la session (triés chronologiquement)
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

  // Récupérer les pré-assignations existantes (triées chronologiquement)
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
      
      // Trier par date puis par heure
      return (data as PreAssignment[]).sort((a, b) => {
        const dateCompare = a.examen.date_examen.localeCompare(b.examen.date_examen);
        if (dateCompare === 0) {
          return a.examen.heure_debut.localeCompare(b.examen.heure_debut);
        }
        return dateCompare;
      });
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
    const dateBelge = formatDateBelgian(examen.date_examen);
    const heures = formatTimeRange(examen.heure_debut, examen.heure_fin);
    const code = examen.code_examen ? ` [${examen.code_examen}]` : '';
    return `${dateBelge} ${heures}${code} | ${examen.matiere} | ${examen.salle}`;
  };

  const formatSurveillantLabel = (surveillant: Surveillant) => {
    return `${surveillant.nom} ${surveillant.prenom} (${surveillant.type})`;
  };

  // Filtrer les surveillants selon la recherche
  const filteredSurveillants = surveillants.filter(surveillant => {
    if (!surveillantSearch) return true;
    const searchLower = surveillantSearch.toLowerCase();
    return (
      surveillant.nom.toLowerCase().includes(searchLower) ||
      surveillant.prenom.toLowerCase().includes(searchLower) ||
      surveillant.email.toLowerCase().includes(searchLower)
    );
  });

  // Filtrer les examens selon la recherche
  const filteredExamens = examens.filter(examen => {
    if (!examenSearch) return true;
    const searchLower = examenSearch.toLowerCase();
    return (
      examen.matiere.toLowerCase().includes(searchLower) ||
      examen.salle.toLowerCase().includes(searchLower) ||
      (examen.code_examen && examen.code_examen.toLowerCase().includes(searchLower))
    );
  });

  // Filter out items with empty or invalid IDs
  const validExamens = filteredExamens.filter(examen => 
    examen && examen.id && typeof examen.id === 'string' && examen.id.trim() !== ''
  );
  
  const validSurveillants = filteredSurveillants.filter(surveillant => 
    surveillant && surveillant.id && typeof surveillant.id === 'string' && surveillant.id.trim() !== ''
  );

  // Filtrer les pré-assignations selon la recherche d'examen
  const filteredPreAssignments = preAssignments.filter(assignment => {
    if (!examenSearch) return true;
    const searchLower = examenSearch.toLowerCase();
    return (
      assignment.examen.matiere.toLowerCase().includes(searchLower) ||
      assignment.examen.salle.toLowerCase().includes(searchLower) ||
      (assignment.examen.code_examen && assignment.examen.code_examen.toLowerCase().includes(searchLower))
    );
  });

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

  if (validSurveillants.length === 0 || validExamens.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-gray-500">
              {surveillants.length === 0 && "Aucun surveillant trouvé dans cette session."}
              {validExamens.length === 0 && "Aucun examen trouvé dans cette session."}
            </p>
            <p className="text-sm text-blue-600">
              💡 Assurez-vous d'avoir importé les données dans l'onglet "Import des Données"
            </p>
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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par matière, salle ou code..."
                    value={examenSearch}
                    onChange={(e) => setExamenSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedExamen} onValueChange={setSelectedExamen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un examen" />
                  </SelectTrigger>
                  <SelectContent>
                    {validExamens.map((examen) => (
                      <SelectItem key={examen.id} value={examen.id}>
                        {formatExamenLabel(examen)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Surveillant</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un surveillant..."
                    value={surveillantSearch}
                    onChange={(e) => setSurveillantSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedSurveillant} onValueChange={setSelectedSurveillant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un surveillant" />
                  </SelectTrigger>
                  <SelectContent>
                    {validSurveillants.map((surveillant) => (
                      <SelectItem key={surveillant.id} value={surveillant.id}>
                        {formatSurveillantLabel(surveillant)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <h4 className="font-medium">Pré-assignations existantes ({filteredPreAssignments.length})</h4>
            {filteredPreAssignments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {examenSearch ? "Aucune pré-assignation trouvée avec ces critères." : "Aucune pré-assignation obligatoire définie."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPreAssignments.map((assignment) => (
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
