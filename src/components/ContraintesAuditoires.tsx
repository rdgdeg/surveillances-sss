
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ContrainteAuditoire {
  id: string;
  auditoire: string;
  nombre_surveillants_requis: number;
  description?: string;
}

interface AuditoireFromExams {
  salle: string;
  examens_count: number;
  has_constraint: boolean;
}

export const ContraintesAuditoires = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [newAuditoire, setNewAuditoire] = useState("");
  const [newNombreSurveillants, setNewNombreSurveillants] = useState(1);
  const [editingConstraints, setEditingConstraints] = useState<Record<string, number>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Récupérer les contraintes existantes
  const { data: contraintes = [] } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('*')
        .order('auditoire');
      
      if (error) throw error;
      return data as ContrainteAuditoire[];
    }
  });

  // Récupérer les auditoires depuis les examens
  const { data: auditoiresFromExams = [] } = useQuery({
    queryKey: ['auditoires-from-examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('salle')
        .eq('session_id', activeSession.id);
      
      if (error) throw error;
      
      // Compter les examens par salle et vérifier les contraintes
      const sallesCounts = data.reduce((acc, exam) => {
        acc[exam.salle] = (acc[exam.salle] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const result: AuditoireFromExams[] = Object.entries(sallesCounts).map(([salle, count]) => ({
        salle,
        examens_count: count,
        has_constraint: contraintes.some(c => c.auditoire === salle)
      }));
      
      return result.sort((a, b) => a.salle.localeCompare(b.salle));
    },
    enabled: !!activeSession?.id
  });

  // Créer une contrainte
  const createContrainte = useMutation({
    mutationFn: async ({ auditoire, nombre }: { auditoire: string; nombre: number }) => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .insert({
          auditoire,
          nombre_surveillants_requis: nombre,
          description: `Contrainte générée automatiquement`
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      queryClient.invalidateQueries({ queryKey: ['auditoires-from-examens'] });
      setNewAuditoire("");
      setNewNombreSurveillants(1);
      setIsAddDialogOpen(false);
      toast({
        title: "Contrainte créée",
        description: "La contrainte d'auditoire a été créée avec succès.",
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

  // Mettre à jour une contrainte
  const updateContrainte = useMutation({
    mutationFn: async ({ id, nombre }: { id: string; nombre: number }) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .update({ nombre_surveillants_requis: nombre })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setEditingConstraints({});
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

  // Supprimer une contrainte
  const deleteContrainte = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      queryClient.invalidateQueries({ queryKey: ['auditoires-from-examens'] });
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

  // Créer des contraintes pour tous les auditoires manquants
  const createMissingConstraints = useMutation({
    mutationFn: async () => {
      const missingAuditoires = auditoiresFromExams.filter(a => !a.has_constraint);
      
      const inserts = missingAuditoires.map(auditoire => ({
        auditoire: auditoire.salle,
        nombre_surveillants_requis: 1,
        description: `Contrainte générée automatiquement depuis les examens`
      }));

      if (inserts.length === 0) return;

      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(inserts);

      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      queryClient.invalidateQueries({ queryKey: ['auditoires-from-examens'] });
      toast({
        title: "Contraintes créées",
        description: `${count} contraintes ont été créées automatiquement.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer les contraintes automatiquement.",
        variant: "destructive"
      });
    }
  });

  const handleUpdateConstraint = (constraintId: string) => {
    const newValue = editingConstraints[constraintId];
    if (newValue && newValue > 0) {
      updateContrainte.mutate({ id: constraintId, nombre: newValue });
    }
  };

  const missingConstraintsCount = auditoiresFromExams.filter(a => !a.has_constraint).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Contraintes d'Auditoires</span>
          </CardTitle>
          <CardDescription>
            Définissez le nombre de surveillants requis par auditoire. 
            Les auditoires sans contrainte utiliseront 1 surveillant par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions */}
          <div className="flex gap-4 flex-wrap">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter contrainte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une contrainte d'auditoire</DialogTitle>
                  <DialogDescription>
                    Définissez le nombre de surveillants requis pour un auditoire spécifique.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Auditoire</label>
                    <Input
                      value={newAuditoire}
                      onChange={(e) => setNewAuditoire(e.target.value)}
                      placeholder="Nom de l'auditoire"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre de surveillants requis</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={newNombreSurveillants}
                      onChange={(e) => setNewNombreSurveillants(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => createContrainte.mutate({ 
                        auditoire: newAuditoire, 
                        nombre: newNombreSurveillants 
                      })}
                      disabled={!newAuditoire || createContrainte.isPending}
                    >
                      Créer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {missingConstraintsCount > 0 && (
              <Button 
                variant="outline" 
                onClick={() => createMissingConstraints.mutate()}
                disabled={createMissingConstraints.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Créer contraintes manquantes ({missingConstraintsCount})
              </Button>
            )}
          </div>

          {/* Auditoires détectés depuis les examens */}
          {auditoiresFromExams.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Auditoires détectés dans les examens</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {auditoiresFromExams.map((auditoire) => (
                  <div 
                    key={auditoire.salle} 
                    className={`p-2 rounded border text-sm ${
                      auditoire.has_constraint 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="font-medium">{auditoire.salle}</div>
                    <div className="text-xs text-gray-600">
                      {auditoire.examens_count} examen(s) • 
                      {auditoire.has_constraint ? (
                        <span className="text-green-600"> Contrainte définie</span>
                      ) : (
                        <span className="text-orange-600"> Aucune contrainte</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tableau des contraintes */}
          <div className="space-y-2">
            <h4 className="font-medium">Contraintes configurées ({contraintes.length})</h4>
            {contraintes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Aucune contrainte définie. Tous les auditoires utiliseront 1 surveillant par défaut.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auditoire</TableHead>
                    <TableHead>Surveillants requis</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contraintes.map((contrainte) => (
                    <TableRow key={contrainte.id}>
                      <TableCell className="font-medium">{contrainte.auditoire}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={editingConstraints[contrainte.id] ?? contrainte.nombre_surveillants_requis}
                            onChange={(e) => setEditingConstraints(prev => ({
                              ...prev,
                              [contrainte.id]: parseInt(e.target.value) || 1
                            }))}
                            className="w-20"
                          />
                          {editingConstraints[contrainte.id] && editingConstraints[contrainte.id] !== contrainte.nombre_surveillants_requis && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateConstraint(contrainte.id)}
                              disabled={updateContrainte.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteContrainte.mutate(contrainte.id)}
                          disabled={deleteContrainte.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
