
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface ContrainteAuditoire {
  id: string;
  auditoire: string;
  nombre_surveillants_requis: number;
  description: string | null;
}

export const ContraintesAuditoires = () => {
  const queryClient = useQueryClient();
  const [newContrainte, setNewContrainte] = useState({
    auditoire: '',
    nombre_surveillants_requis: 1,
    description: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<ContrainteAuditoire>>({});

  const { data: contraintes, isLoading } = useQuery({
    queryKey: ['contraintes-auditoires'],
    queryFn: async (): Promise<ContrainteAuditoire[]> => {
      const { data, error } = await supabase
        .from('contraintes_auditoires')
        .select('*')
        .order('auditoire');

      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (contrainte: typeof newContrainte) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(contrainte);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setNewContrainte({ auditoire: '', nombre_surveillants_requis: 1, description: '' });
      toast({
        title: "Contrainte ajoutée",
        description: "La contrainte d'auditoire a été ajoutée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la contrainte.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContrainteAuditoire> }) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setEditingId(null);
      setEditingData({});
      toast({
        title: "Contrainte mise à jour",
        description: "La contrainte d'auditoire a été mise à jour avec succès.",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      toast({
        title: "Contrainte supprimée",
        description: "La contrainte d'auditoire a été supprimée avec succès.",
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

  const handleCreate = () => {
    if (!newContrainte.auditoire) {
      toast({
        title: "Champ requis",
        description: "Veuillez spécifier le nom de l'auditoire.",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(newContrainte);
  };

  const handleEdit = (contrainte: ContrainteAuditoire) => {
    setEditingId(contrainte.id);
    setEditingData(contrainte);
  };

  const handleSave = () => {
    if (editingId && editingData) {
      updateMutation.mutate({ id: editingId, updates: editingData });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des contraintes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Contraintes d'Auditoires</span>
          </CardTitle>
          <CardDescription>
            Gérez le nombre de surveillants requis par auditoire selon les spécificités de chaque local
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Formulaire d'ajout */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">Ajouter une nouvelle contrainte</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auditoire">Auditoire</Label>
                <Input
                  id="auditoire"
                  value={newContrainte.auditoire}
                  onChange={(e) => setNewContrainte(prev => ({ ...prev, auditoire: e.target.value }))}
                  placeholder="Ex: 51A Lacroix"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de surveillants</Label>
                <Input
                  id="nombre"
                  type="number"
                  min="1"
                  value={newContrainte.nombre_surveillants_requis}
                  onChange={(e) => setNewContrainte(prev => ({ ...prev, nombre_surveillants_requis: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newContrainte.description}
                  onChange={(e) => setNewContrainte(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description optionnelle"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Tableau des contraintes */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auditoire</TableHead>
                <TableHead className="text-center">Surveillants requis</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contraintes?.map((contrainte) => (
                <TableRow key={contrainte.id}>
                  <TableCell>
                    {editingId === contrainte.id ? (
                      <Input
                        value={editingData.auditoire || ''}
                        onChange={(e) => setEditingData(prev => ({ ...prev, auditoire: e.target.value }))}
                      />
                    ) : (
                      <Badge variant="outline" className="font-mono">
                        {contrainte.auditoire}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingId === contrainte.id ? (
                      <Input
                        type="number"
                        min="1"
                        value={editingData.nombre_surveillants_requis || 1}
                        onChange={(e) => setEditingData(prev => ({ ...prev, nombre_surveillants_requis: parseInt(e.target.value) || 1 }))}
                        className="w-20 text-center"
                      />
                    ) : (
                      <Badge variant={contrainte.nombre_surveillants_requis > 2 ? "destructive" : contrainte.nombre_surveillants_requis === 2 ? "default" : "secondary"}>
                        {contrainte.nombre_surveillants_requis}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contrainte.id ? (
                      <Input
                        value={editingData.description || ''}
                        onChange={(e) => setEditingData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description optionnelle"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {contrainte.description || 'Aucune description'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {editingId === contrainte.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(contrainte)}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(contrainte.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
