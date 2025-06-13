
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardList, Users, Save, Eye, Building2, Search } from "lucide-react";
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

interface ContrainteAuditoire {
  auditoire: string;
  nombre_surveillants_requis: number;
}

export const ExamenReviewManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [editingExamens, setEditingExamens] = useState<Record<string, Partial<ExamenReview>>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-review', activeSession?.id],
    queryFn: async (): Promise<ExamenReview[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'NON_TRAITE')
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const { data: contraintesAuditoires } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async (): Promise<ContrainteAuditoire[]> => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('auditoire, nombre_surveillants_requis');

      if (error) throw error;
      return data || [];
    }
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

  const applquerContraintesAuditoiresMutation = useMutation({
    mutationFn: async () => {
      if (!examens || !contraintesAuditoires) return;

      const updates = examens.map(examen => {
        const contrainte = contraintesAuditoires.find(c => c.auditoire === examen.salle);
        const nouveauNombre = contrainte ? contrainte.nombre_surveillants_requis : 1;
        
        return {
          id: examen.id,
          nombre_surveillants: nouveauNombre
        };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('examens')
          .update({ nombre_surveillants: update.nombre_surveillants })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-review'] });
      toast({
        title: "Contraintes appliquées",
        description: "Les contraintes d'auditoires ont été appliquées à tous les examens.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'appliquer les contraintes.",
        variant: "destructive"
      });
    }
  });

  const getContrainteAuditoire = (salle: string): number | null => {
    const contrainte = contraintesAuditoires?.find(c => c.auditoire === salle);
    return contrainte ? contrainte.nombre_surveillants_requis : null;
  };

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

  const filteredExamens = examens?.filter(examen => 
    examen.code_examen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.matiere.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.salle.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          {/* Actions globales */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un examen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              onClick={() => applquerContraintesAuditoiresMutation.mutate()}
              disabled={applquerContraintesAuditoiresMutation.isPending || !contraintesAuditoires}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Appliquer contraintes auditoires
            </Button>
          </div>

          {/* Résumé des contraintes appliquées */}
          {contraintesAuditoires && contraintesAuditoires.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Contraintes d'auditoires disponibles</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {contraintesAuditoires.map(contrainte => (
                  <div key={contrainte.auditoire} className="bg-white p-2 rounded text-sm">
                    <span className="font-medium">{contrainte.auditoire}:</span>
                    <span className="ml-1 text-purple-600">{contrainte.nombre_surveillants_requis} surveillant(s)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code/Matière</TableHead>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Auditoire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Contrainte</TableHead>
                  <TableHead>Enseig.</TableHead>
                  <TableHead>Amenés</TableHead>
                  <TableHead>Pré-ass.</TableHead>
                  <TableHead>À Attrib.</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExamens?.map((examen) => {
                  const contrainteAuditoire = getContrainteAuditoire(examen.salle);
                  return (
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
                          value={getFieldValue(examen, 'nombre_surveillants')}
                          onChange={(e) => handleFieldChange(examen.id, 'nombre_surveillants', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        {contrainteAuditoire ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-800">
                            {contrainteAuditoire}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">1 (défaut)</Badge>
                        )}
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
                            (getFieldValue(examen, 'nombre_surveillants') as number) - 
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredExamens && filteredExamens.length === 0 && (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Aucun examen trouvé pour cette recherche' : 'Aucun examen non traité trouvé'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Importez et validez des examens pour les voir apparaître ici
              </p>
            </div>
          )}

          {filteredExamens && filteredExamens.length > 0 && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-blue-600">
                    {filteredExamens.length}
                    {searchTerm && examens && ` / ${examens.length}`}
                  </div>
                  <div className="text-blue-800">
                    {searchTerm ? 'Examens trouvés' : 'Examens non traités'}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-green-600">
                    {filteredExamens.reduce((sum, e) => sum + Math.max(0, 
                      (e.nombre_surveillants || 0) - 
                      (e.surveillants_enseignant || 0) - 
                      (e.surveillants_amenes || 0) - 
                      (e.surveillants_pre_assignes || 0)
                    ), 0)}
                  </div>
                  <div className="text-green-800">Total à attribuer</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-purple-600">
                    {new Set(filteredExamens.map(e => e.salle)).size}
                  </div>
                  <div className="text-purple-800">Auditoires distincts</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="font-bold text-orange-600">
                    {new Set(filteredExamens.map(e => e.date_examen)).size}
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
