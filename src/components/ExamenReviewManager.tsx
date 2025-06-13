
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Save, Calculator } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ExamenData {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  nombre_surveillants: number;
  surveillants_enseignant: number;
  surveillants_amenes: number;
  surveillants_pre_assignes: number;
  surveillants_a_attribuer: number;
  type_requis: string;
}

export const ExamenReviewManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [modifiedExamens, setModifiedExamens] = useState<Record<string, Partial<ExamenData>>>({});

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenData[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const updateExamenMutation = useMutation({
    mutationFn: async ({ examenId, updates }: { examenId: string; updates: Partial<ExamenData> }) => {
      const { error } = await supabase
        .from('examens')
        .update(updates)
        .eq('id', examenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      toast({
        title: "Succès",
        description: "Les modifications ont été sauvegardées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    }
  });

  const handleFieldChange = (examenId: string, field: keyof ExamenData, value: number) => {
    setModifiedExamens(prev => ({
      ...prev,
      [examenId]: {
        ...prev[examenId],
        [field]: value
      }
    }));
  };

  const saveExamen = (examenId: string) => {
    const updates = modifiedExamens[examenId];
    if (updates) {
      updateExamenMutation.mutate({ examenId, updates });
      setModifiedExamens(prev => {
        const newState = { ...prev };
        delete newState[examenId];
        return newState;
      });
    }
  };

  const getDisplayValue = (examen: ExamenData, field: keyof ExamenData) => {
    return modifiedExamens[examen.id]?.[field] ?? examen[field];
  };

  const hasModifications = (examenId: string) => {
    return !!modifiedExamens[examenId];
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des examens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardList className="h-5 w-5" />
            <span>Révision des Besoins en Surveillants</span>
          </CardTitle>
          <CardDescription>
            Ajustez le nombre de surveillants à attribuer pour chaque examen avant l'attribution automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Requis</TableHead>
                  <TableHead className="text-center">Enseignant</TableHead>
                  <TableHead className="text-center">Amenés</TableHead>
                  <TableHead className="text-center">Pré-assignés</TableHead>
                  <TableHead className="text-center">À attribuer</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examens?.map((examen) => (
                  <TableRow key={examen.id} className={hasModifications(examen.id) ? "bg-yellow-50" : ""}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{examen.date_examen}</div>
                        <div className="text-muted-foreground">{examen.heure_debut} - {examen.heure_fin}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{examen.matiere}</TableCell>
                    <TableCell>{examen.salle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{examen.type_requis}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{examen.nombre_surveillants}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={getDisplayValue(examen, 'surveillants_enseignant')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_enseignant', parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={getDisplayValue(examen, 'surveillants_amenes')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_amenes', parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={getDisplayValue(examen, 'surveillants_pre_assignes')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_pre_assignes', parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Calculator className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-blue-600">{examen.surveillants_a_attribuer}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasModifications(examen.id) && (
                        <Button
                          size="sm"
                          onClick={() => saveExamen(examen.id)}
                          disabled={updateExamenMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Sauver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
