
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface ContrainteAuditoire {
  id: string;
  auditoire: string;
  nombre_surveillants_requis: number;
  description?: string;
}

export const ContraintesAuditoires = () => {
  const queryClient = useQueryClient();
  const [newContrainte, setNewContrainte] = useState({
    auditoire: '',
    nombre_surveillants_requis: 1,
    description: ''
  });

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
    mutationFn: async (contrainte: Omit<ContrainteAuditoire, 'id'>) => {
      const { error } = await supabase
        .from('contraintes_auditoires')
        .insert(contrainte);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contraintes-auditoires'] });
      setNewContrainte({ auditoire: '', nombre_surveillants_requis: 1, description: '' });
      toast({
        title: "Succès",
        description: "Contrainte d'auditoire créée avec succès.",
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
        title: "Succès",
        description: "Contrainte d'auditoire supprimée.",
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
    if (!newContrainte.auditoire.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'auditoire est requis.",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(newContrainte);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des contraintes d'auditoires...</p>
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
            <span>Contraintes par Auditoire</span>
          </CardTitle>
          <CardDescription>
            Définissez le nombre de surveillants requis pour chaque auditoire spécifique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulaire d'ajout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="auditoire">Auditoire</Label>
              <Input
                id="auditoire"
                value={newContrainte.auditoire}
                onChange={(e) => setNewContrainte(prev => ({ ...prev, auditoire: e.target.value }))}
                placeholder="ex: 51B"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nb Surveillants</Label>
              <Input
                id="nombre"
                type="number"
                min="1"
                value={newContrainte.nombre_surveillants_requis}
                onChange={(e) => setNewContrainte(prev => ({ 
                  ...prev, 
                  nombre_surveillants_requis: parseInt(e.target.value) || 1 
                }))}
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

          {/* Liste des contraintes */}
          <div className="overflow-x-auto">
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
                {contraintes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucune contrainte d'auditoire définie
                    </TableCell>
                  </TableRow>
                ) : (
                  contraintes?.map((contrainte) => (
                    <TableRow key={contrainte.id}>
                      <TableCell className="font-medium">{contrainte.auditoire}</TableCell>
                      <TableCell className="text-center">{contrainte.nombre_surveillants_requis}</TableCell>
                      <TableCell>{contrainte.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(contrainte.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {contraintes && contraintes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {contraintes.length} contrainte(s) d'auditoire configurée(s)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
