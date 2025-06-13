
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Save, Trash2, Search, RefreshCw, Edit2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ContrainteAuditoire {
  id: string;
  auditoire: string;
  nombre_surveillants_requis: number;
  description?: string;
}

interface AuditoireDetecte {
  auditoire: string;
  count: number;
  has_constraint: boolean;
}

export const ContraintesAuditoires = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [newContrainte, setNewContrainte] = useState({
    auditoire: '',
    nombre_surveillants_requis: 1,
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
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

  const { data: auditoiresDetectes, isLoading: isLoadingAuditoires } = useQuery({
    queryKey: ['auditoires-detectes', activeSession?.id],
    queryFn: async (): Promise<AuditoireDetecte[]> => {
      if (!activeSession?.id) return [];

      const { data: examens, error } = await supabase
        .from('examens')
        .select('salle')
        .eq('session_id', activeSession.id);

      if (error) throw error;

      // Grouper les auditoires et compter les occurrences
      const auditoiresMap = new Map<string, number>();
      examens?.forEach(examen => {
        if (examen.salle) {
          auditoiresMap.set(examen.salle, (auditoiresMap.get(examen.salle) || 0) + 1);
        }
      });

      // Vérifier quels auditoires ont déjà des contraintes
      const auditoiresArray = Array.from(auditoiresMap.entries()).map(([auditoire, count]) => ({
        auditoire,
        count,
        has_constraint: contraintes?.some(c => c.auditoire === auditoire) || false
      }));

      return auditoiresArray.sort((a, b) => a.auditoire.localeCompare(b.auditoire));
    },
    enabled: !!activeSession?.id && !!contraintes
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
      queryClient.invalidateQueries({ queryKey: ['auditoires-detectes'] });
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
        title: "Succès",
        description: "Contrainte d'auditoire mise à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la contrainte.",
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
      queryClient.invalidateQueries({ queryKey: ['auditoires-detectes'] });
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

  const createContrainteFromAuditoire = (auditoire: string) => {
    setNewContrainte(prev => ({ ...prev, auditoire }));
  };

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

  const startEditing = (contrainte: ContrainteAuditoire) => {
    setEditingId(contrainte.id);
    setEditingData(contrainte);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEditing = () => {
    if (editingId && editingData) {
      updateMutation.mutate({ id: editingId, updates: editingData });
    }
  };

  const filteredContraintes = contraintes?.filter(contrainte =>
    contrainte.auditoire.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contrainte.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const auditoiresSansContrainte = auditoiresDetectes?.filter(a => !a.has_constraint) || [];

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
          {/* Barre de recherche */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un auditoire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['auditoires-detectes'] })}
              disabled={isLoadingAuditoires}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Auditoires détectés sans contrainte */}
          {auditoiresSansContrainte.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-800">
                  Auditoires détectés sans contrainte ({auditoiresSansContrainte.length})
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Ces auditoires sont utilisés dans vos examens mais n'ont pas de contrainte définie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {auditoiresSansContrainte.map((auditoire) => (
                    <div key={auditoire.auditoire} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <div className="font-medium">{auditoire.auditoire}</div>
                        <div className="text-sm text-gray-500">{auditoire.count} examen(s)</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createContrainteFromAuditoire(auditoire.auditoire)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                  <TableHead className="text-center">Utilisation</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContraintes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune contrainte d'auditoire définie
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContraintes?.map((contrainte) => {
                    const usage = auditoiresDetectes?.find(a => a.auditoire === contrainte.auditoire);
                    const isEditing = editingId === contrainte.id;
                    
                    return (
                      <TableRow key={contrainte.id}>
                        <TableCell className="font-medium">{contrainte.auditoire}</TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="1"
                              value={editingData.nombre_surveillants_requis}
                              onChange={(e) => setEditingData(prev => ({
                                ...prev,
                                nombre_surveillants_requis: parseInt(e.target.value) || 1
                              }))}
                              className="w-20 mx-auto"
                            />
                          ) : (
                            contrainte.nombre_surveillants_requis
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editingData.description || ''}
                              onChange={(e) => setEditingData(prev => ({
                                ...prev,
                                description: e.target.value
                              }))}
                              placeholder="Description"
                            />
                          ) : (
                            contrainte.description || '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {usage ? (
                            <Badge variant="outline">
                              {usage.count} examen(s)
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Non utilisé</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveEditing}
                                  disabled={updateMutation.isPending}
                                >
                                  <Save className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditing}
                                >
                                  <X className="h-4 w-4 text-gray-500" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(contrainte)}
                                >
                                  <Edit2 className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(contrainte.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {contraintes && contraintes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {filteredContraintes.length} contrainte(s) d'auditoire configurée(s)
              {searchTerm && ` (${contraintes.length} au total)`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
