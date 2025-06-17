
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, Save, X, Search, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";

interface DisponibiliteDetail {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  type_choix: string;
  nom_examen_selectionne: string;
  created_at: string;
}

export const SurveillantDisponibilitesEditor = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedSurveillant, setSelectedSurveillant] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    type_choix: string;
    nom_examen_selectionne: string;
  }>({ type_choix: "", nom_examen_selectionne: "" });

  // Rechercher un surveillant par email
  const handleSearchSurveillant = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir un email pour rechercher un surveillant.",
        variant: "destructive"
      });
      return;
    }

    const { data, error } = await supabase
      .from('surveillants')
      .select('id, nom, prenom, email, type')
      .eq('email', searchEmail.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Surveillant non trouvé",
        description: "Aucun surveillant trouvé avec cet email.",
        variant: "destructive"
      });
      setSelectedSurveillant(null);
      return;
    }

    setSelectedSurveillant(data);
    toast({
      title: "Surveillant trouvé",
      description: `${data.prenom} ${data.nom} (${data.type})`,
    });
  };

  // Récupérer les disponibilités du surveillant sélectionné
  const { data: disponibilites = [], isLoading } = useQuery({
    queryKey: ['surveillant-disponibilites', selectedSurveillant?.id, activeSession?.id],
    queryFn: async (): Promise<DisponibiliteDetail[]> => {
      if (!selectedSurveillant?.id || !activeSession?.id) return [];

      const { data, error } = await supabase
        .from('disponibilites')
        .select('*')
        .eq('surveillant_id', selectedSurveillant.id)
        .eq('session_id', activeSession.id)
        .eq('est_disponible', true)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSurveillant?.id && !!activeSession?.id
  });

  // Mutation pour modifier une disponibilité
  const updateDisponibiliteMutation = useMutation({
    mutationFn: async ({ id, type_choix, nom_examen_selectionne }: {
      id: string;
      type_choix: string;
      nom_examen_selectionne: string;
    }) => {
      const { error } = await supabase
        .from('disponibilites')
        .update({
          type_choix,
          nom_examen_selectionne
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillant-disponibilites'] });
      toast({
        title: "Modification sauvegardée",
        description: "La disponibilité a été mise à jour.",
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation pour supprimer une disponibilité
  const deleteDisponibiliteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('disponibilites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillant-disponibilites'] });
      toast({
        title: "Disponibilité supprimée",
        description: "La disponibilité a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation pour supprimer toutes les disponibilités
  const deleteAllDisponibilitesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSurveillant?.id || !activeSession?.id) return;

      const { error } = await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', selectedSurveillant.id)
        .eq('session_id', activeSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillant-disponibilites'] });
      toast({
        title: "Toutes les disponibilités supprimées",
        description: "Toutes les disponibilités du surveillant ont été supprimées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handlers pour l'édition
  const startEdit = (dispo: DisponibiliteDetail) => {
    setEditingId(dispo.id);
    setEditValues({
      type_choix: dispo.type_choix,
      nom_examen_selectionne: dispo.nom_examen_selectionne
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateDisponibiliteMutation.mutate({
      id: editingId,
      ...editValues
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ type_choix: "", nom_examen_selectionne: "" });
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour gérer les disponibilités.
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
            <User className="h-5 w-5" />
            <span>Gestion des disponibilités par surveillant</span>
          </CardTitle>
          <CardDescription>
            Recherchez un surveillant pour modifier ou supprimer ses disponibilités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email du surveillant..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSurveillant()}
                />
              </div>
            </div>
            <Button onClick={handleSearchSurveillant}>
              Rechercher
            </Button>
          </div>

          {selectedSurveillant && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-800">
                    {selectedSurveillant.prenom} {selectedSurveillant.nom}
                  </h3>
                  <p className="text-sm text-blue-600">
                    {selectedSurveillant.email} • {selectedSurveillant.type}
                  </p>
                  <p className="text-sm text-blue-600">
                    {disponibilites.length} disponibilité(s) pour {activeSession.name}
                  </p>
                </div>
                {disponibilites.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Supprimer toutes les disponibilités
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmer la suppression</DialogTitle>
                        <DialogDescription>
                          Êtes-vous sûr de vouloir supprimer toutes les disponibilités de {selectedSurveillant.prenom} {selectedSurveillant.nom} ?
                          Cette action ne peut pas être annulée.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Annuler</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => deleteAllDisponibilitesMutation.mutate()}
                          disabled={deleteAllDisponibilitesMutation.isPending}
                        >
                          Supprimer tout
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSurveillant && (
        <Card>
          <CardHeader>
            <CardTitle>Disponibilités de {selectedSurveillant.prenom} {selectedSurveillant.nom}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Chargement...</p>
            ) : disponibilites.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Horaire</TableHead>
                      <TableHead>Type Choix</TableHead>
                      <TableHead>Examen Spécifié</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disponibilites.map((dispo) => (
                      <TableRow key={dispo.id}>
                        <TableCell>
                          {formatDateBelgian(dispo.date_examen)}
                        </TableCell>
                        <TableCell>
                          {formatTimeRange(dispo.heure_debut, dispo.heure_fin)}
                        </TableCell>
                        <TableCell>
                          {editingId === dispo.id ? (
                            <Select 
                              value={editValues.type_choix} 
                              onValueChange={(value) => setEditValues(prev => ({ ...prev, type_choix: value }))}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="souhaitee">Souhaité</SelectItem>
                                <SelectItem value="obligatoire">Obligatoire</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={dispo.type_choix === 'obligatoire' ? 'destructive' : 'default'}>
                              {dispo.type_choix === 'obligatoire' ? 'Obligatoire' : 'Souhaité'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === dispo.id ? (
                            <Input
                              value={editValues.nom_examen_selectionne}
                              onChange={(e) => setEditValues(prev => ({ ...prev, nom_examen_selectionne: e.target.value }))}
                              placeholder="Code ou nom examen"
                              className="w-40"
                            />
                          ) : (
                            <span className="text-sm">
                              {dispo.nom_examen_selectionne || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {editingId === dispo.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={saveEdit}
                                  disabled={updateDisponibiliteMutation.isPending}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(dispo)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Confirmer la suppression</DialogTitle>
                                      <DialogDescription>
                                        Supprimer la disponibilité du {formatDateBelgian(dispo.date_examen)} 
                                        de {formatTimeRange(dispo.heure_debut, dispo.heure_fin)} ?
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline">Annuler</Button>
                                      <Button 
                                        variant="destructive" 
                                        onClick={() => deleteDisponibiliteMutation.mutate(dispo.id)}
                                        disabled={deleteDisponibiliteMutation.isPending}
                                      >
                                        Supprimer
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Aucune disponibilité trouvée pour ce surveillant.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
