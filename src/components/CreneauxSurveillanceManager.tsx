
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Plus, Edit, Trash2, Check, X, CheckCircle, Calendar, Settings } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { CreneauxVueSemaines } from "./CreneauxVueSemaines";

interface CreneauSurveillanceConfig {
  id: string;
  session_id: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string | null;
  description: string | null;
  is_active: boolean;
  is_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface CreneauFormData {
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string;
  description: string;
}

export const CreneauxSurveillanceManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<CreneauSurveillanceConfig | null>(null);
  const [formData, setFormData] = useState<CreneauFormData>({
    heure_debut: "",
    heure_fin: "",
    nom_creneau: "",
    description: ""
  });

  // Récupérer les créneaux de surveillance configurés pour la session active
  const { data: creneaux = [], isLoading } = useQuery({
    queryKey: ['creneaux-surveillance-config', activeSession?.id],
    queryFn: async (): Promise<CreneauSurveillanceConfig[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour créer un nouveau créneau
  const createCreneauMutation = useMutation({
    mutationFn: async (data: CreneauFormData) => {
      if (!activeSession?.id) throw new Error('Session non active');

      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .insert({
          session_id: activeSession.id,
          heure_debut: data.heure_debut,
          heure_fin: data.heure_fin,
          nom_creneau: data.nom_creneau,
          description: data.description,
          is_active: true,
          is_validated: false,
          created_by: 'admin'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Créneau créé",
        description: "Le nouveau créneau de surveillance a été créé avec succès.",
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

  // Mutation pour modifier un créneau
  const updateCreneauMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreneauFormData> }) => {
      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
      setEditingCreneau(null);
      resetForm();
      toast({
        title: "Créneau modifié",
        description: "Le créneau a été modifié avec succès.",
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

  // Mutation pour supprimer un créneau
  const deleteCreneauMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
      toast({
        title: "Créneau supprimé",
        description: "Le créneau a été supprimé avec succès.",
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

  // Mutation pour valider/invalider un créneau
  const toggleValidationMutation = useMutation({
    mutationFn: async ({ id, isValidated }: { id: string; isValidated: boolean }) => {
      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .update({
          is_validated: isValidated,
          validated_by: isValidated ? 'admin' : null,
          validated_at: isValidated ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
      toast({
        title: "Statut modifié",
        description: "Le statut de validation du créneau a été modifié.",
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

  const resetForm = () => {
    setFormData({
      heure_debut: "",
      heure_fin: "",
      nom_creneau: "",
      description: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCreneau) {
      updateCreneauMutation.mutate({ id: editingCreneau.id, data: formData });
    } else {
      createCreneauMutation.mutate(formData);
    }
  };

  const handleEdit = (creneau: CreneauSurveillanceConfig) => {
    setEditingCreneau(creneau);
    setFormData({
      heure_debut: creneau.heure_debut,
      heure_fin: creneau.heure_fin,
      nom_creneau: creneau.nom_creneau || "",
      description: creneau.description || ""
    });
  };

  const handleCancelEdit = () => {
    setEditingCreneau(null);
    resetForm();
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour gérer les créneaux de surveillance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const creneauxActifs = creneaux.filter(c => c.is_active);
  const creneauxValides = creneaux.filter(c => c.is_validated && c.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Gestion des créneaux de surveillance</span>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - {creneauxActifs.length} créneaux configurés, {creneauxValides.length} validés
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="vue-semaines" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vue-semaines" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Vue par semaines</span>
          </TabsTrigger>
          <TabsTrigger value="gestion" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vue-semaines" className="space-y-6">
          <CreneauxVueSemaines />
        </TabsContent>

        <TabsContent value="gestion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configuration des créneaux</span>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Nouveau créneau</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau créneau</DialogTitle>
                      <DialogDescription>
                        Définissez un nouveau créneau de surveillance pour la session {activeSession.name}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="heure_debut">Heure de début</Label>
                          <Input
                            type="time"
                            id="heure_debut"
                            value={formData.heure_debut}
                            onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="heure_fin">Heure de fin</Label>
                          <Input
                            type="time"
                            id="heure_fin"
                            value={formData.heure_fin}
                            onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="nom_creneau">Nom du créneau</Label>
                        <Input
                          id="nom_creneau"
                          value={formData.nom_creneau}
                          onChange={(e) => setFormData({ ...formData, nom_creneau: e.target.value })}
                          placeholder="Ex: Matin Étendu"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Ex: Pour examens longs du matin"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit">Créer</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Chargement...</p>
              ) : creneaux.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Créneau</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creneaux.map((creneau) => (
                      <TableRow key={creneau.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingCreneau?.id === creneau.id ? (
                            <Input
                              value={formData.nom_creneau}
                              onChange={(e) => setFormData({ ...formData, nom_creneau: e.target.value })}
                              className="w-32"
                            />
                          ) : (
                            creneau.nom_creneau || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCreneau?.id === creneau.id ? (
                            <Input
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-48"
                            />
                          ) : (
                            <div className="max-w-xs truncate" title={creneau.description || ""}>
                              {creneau.description || "-"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={creneau.is_active ? "default" : "secondary"}>
                              {creneau.is_active ? "Actif" : "Inactif"}
                            </Badge>
                            <Badge 
                              variant={creneau.is_validated ? "default" : "outline"}
                              className={creneau.is_validated ? "bg-green-100 text-green-800" : ""}
                            >
                              {creneau.is_validated ? "Validé" : "Non validé"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {editingCreneau?.id === creneau.id ? (
                              <>
                                <Button size="sm" onClick={handleSubmit}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(creneau)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={creneau.is_validated ? "outline" : "default"}
                                  onClick={() => toggleValidationMutation.mutate({ 
                                    id: creneau.id, 
                                    isValidated: !creneau.is_validated 
                                  })}
                                >
                                  {creneau.is_validated ? <X className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer le créneau</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer le créneau {formatTimeRange(creneau.heure_debut, creneau.heure_fin)} ?
                                        Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteCreneauMutation.mutate(creneau.id)}
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500">
                  Aucun créneau configuré pour cette session.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vue-par-jour" className="space-y-6">
          <CreneauxVueParJour />
        </TabsContent>
      </Tabs>
    </div>
  );
};
