
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardList, Users, Save, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExamenReview {
  id: string;
  code_examen: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  salle: string;
  nombre_surveillants: number;
  surveillants_enseignant: number;
  surveillants_amenes: number;
  surveillants_pre_assignes: number;
  surveillants_a_attribuer: number;
  type_requis: string;
  statut_validation: string;
}

export const ExamenReviewManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editingExamens, setEditingExamens] = useState<Record<string, Partial<ExamenReview>>>({});

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenReview[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const updateExamenMutation = useMutation({
    mutationFn: async ({ examenId, updates }: { examenId: string; updates: Partial<ExamenReview> }) => {
      const { error } = await supabase
        .from('examens')
        .update(updates)
        .eq('id', examenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      setEditingExamens({});
      toast({
        title: "Examen mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'examen.",
        variant: "destructive"
      });
    }
  });

  const handleFieldChange = (examenId: string, field: string, value: string | number) => {
    setEditingExamens(prev => ({
      ...prev,
      [examenId]: {
        ...prev[examenId],
        [field]: value
      }
    }));
  };

  const handleSaveExamen = (examen: ExamenReview) => {
    const updates = editingExamens[examen.id];
    if (!updates || Object.keys(updates).length === 0) return;

    updateExamenMutation.mutate({
      examenId: examen.id,
      updates
    });
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "VALIDE": return "bg-green-100 text-green-800";
      case "NON_TRAITE": return "bg-gray-100 text-gray-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getFieldValue = (examen: ExamenReview, field: keyof ExamenReview) => {
    return editingExamens[examen.id]?.[field] ?? examen[field];
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
            <span>Révision des Besoins par Auditoire</span>
          </CardTitle>
          <CardDescription>
            Configurez les besoins en surveillance pour chaque examen et auditoire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code/Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Auditoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Surveillants Enseig.</TableHead>
                  <TableHead>Surveillants Amenés</TableHead>
                  <TableHead>Pré-assignés</TableHead>
                  <TableHead>À Attribuer</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examens?.map((examen) => (
                  <TableRow key={examen.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm">{examen.code_examen}</div>
                        <div className="text-sm text-gray-600">{examen.matiere}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{examen.date_examen}</div>
                        <div className="text-gray-500">
                          {examen.heure_debut} - {examen.heure_fin}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{examen.salle}</div>
                      <div className="text-xs text-gray-500">
                        Base: {examen.nombre_surveillants}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(examen.statut_validation)}>
                        {examen.statut_validation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={getFieldValue(examen, 'surveillants_enseignant')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_enseignant', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={getFieldValue(examen, 'surveillants_amenes')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_amenes', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={getFieldValue(examen, 'surveillants_pre_assignes')}
                        onChange={(e) => handleFieldChange(examen.id, 'surveillants_pre_assignes', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-center">
                        {Math.max(0, 
                          examen.nombre_surveillants - 
                          (getFieldValue(examen, 'surveillants_enseignant') as number) - 
                          (getFieldValue(examen, 'surveillants_amenes') as number) - 
                          (getFieldValue(examen, 'surveillants_pre_assignes') as number)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSaveExamen(examen)}
                          disabled={!editingExamens[examen.id] || updateExamenMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {examens && examens.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun examen validé trouvé</p>
              <p className="text-sm text-gray-400 mt-2">
                Importez et validez des examens pour les voir apparaître ici
              </p>
            </div>
          )}

          {examens && examens.length > 0 && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-blue-600">{examens.length}</div>
                  <div className="text-blue-800">Examens validés</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-green-600">
                    {examens.reduce((sum, e) => sum + (e.surveillants_a_attribuer || 0), 0)}
                  </div>
                  <div className="text-green-800">Total à attribuer</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-purple-600">
                    {new Set(examens.map(e => e.salle)).size}
                  </div>
                  <div className="text-purple-800">Auditoires distincts</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-orange-600">
                    {new Set(examens.map(e => e.date_examen)).size}
                  </div>
                  <div className="text-orange-800">Jours d'examens</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
