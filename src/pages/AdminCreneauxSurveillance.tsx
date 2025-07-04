
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Eye,
  AlertCircle,
  Settings
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDateBelgian, formatTimeRange } from "@/lib/dateUtils";
import { useSessions } from "@/hooks/useSessions";

interface CreneauConfig {
  id: string;
  session_id: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string | null;
  description: string | null;
  is_active: boolean;
  is_validated: boolean;
  type_creneau: 'standard' | 'manuel' | 'etendu';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreneauFormData {
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string;
  description: string;
}

export default function AdminCreneauxSurveillance() {
  const queryClient = useQueryClient();
  const { data: sessions } = useSessions();
  const activeSession = sessions?.find(s => s.is_active);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<CreneauConfig | null>(null);
  const [formData, setFormData] = useState<CreneauFormData>({
    heure_debut: "",
    heure_fin: "",
    nom_creneau: "",
    description: ""
  });

  // Récupérer les créneaux de surveillance
  const { data: creneaux = [], isLoading } = useQuery({
    queryKey: ['creneaux-surveillance-config', activeSession?.id],
    queryFn: async (): Promise<CreneauConfig[]> => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('heure_debut');
      
      if (error) throw error;
      return data as CreneauConfig[];
    },
    enabled: !!activeSession?.id
  });

  // Générer automatiquement les créneaux standards
  const genererCreneauxMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) throw new Error('Aucune session active');
      
      const { data, error } = await supabase.rpc('generer_creneaux_standards', {
        p_session_id: activeSession.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (nbCreneaux) => {
      toast({
        title: "Créneaux générés",
        description: `${nbCreneaux} créneau(x) standard(s) ont été générés automatiquement.`
      });
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la génération des créneaux",
        variant: "destructive"
      });
    }
  });

  // Créer un nouveau créneau manuel
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
          type_creneau: 'manuel',
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
        description: "Le nouveau créneau a été créé avec succès.",
      });
    }
  });

  // Modifier un créneau
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
    }
  });

  // Supprimer un créneau
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
    }
  });

  // Valider/Invalider un créneau
  const toggleValidationMutation = useMutation({
    mutationFn: async ({ id, isValidated }: { id: string; isValidated: boolean }) => {
      const { error } = await supabase
        .from('creneaux_surveillance_config')
        .update({
          is_validated: isValidated
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

  const handleEdit = (creneau: CreneauConfig) => {
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
      <AdminLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune session active trouvée. Veuillez activer une session pour gérer les créneaux.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const statsCreneaux = {
    total: creneaux.length,
    valides: creneaux.filter(c => c.is_validated).length,
    standards: creneaux.filter(c => c.type_creneau === 'standard').length,
    manuels: creneaux.filter(c => c.type_creneau === 'manuel').length,
    etendus: creneaux.filter(c => c.type_creneau === 'etendu').length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Gestion des Créneaux de Surveillance (Simplifié)</h1>
          <p className="text-muted-foreground">
            Session active : {activeSession.name} ({activeSession.year})
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{statsCreneaux.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statsCreneaux.valides}</div>
                <p className="text-xs text-muted-foreground">Validés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statsCreneaux.standards}</div>
                <p className="text-xs text-muted-foreground">Standards</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{statsCreneaux.etendus}</div>
                <p className="text-xs text-muted-foreground">Étendus</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{statsCreneaux.manuels}</div>
                <p className="text-xs text-muted-foreground">Manuels</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button
              onClick={() => genererCreneauxMutation.mutate()}
              disabled={genererCreneauxMutation.isPending}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${genererCreneauxMutation.isPending ? 'animate-spin' : ''}`} />
              <span>
                {genererCreneauxMutation.isPending ? 'Génération...' : 'Générer créneaux standards'}
              </span>
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Ajouter créneau manuel</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un nouveau créneau</DialogTitle>
                  <DialogDescription>
                    Ajoutez un créneau de surveillance personnalisé pour la session {activeSession.name}
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
                      placeholder="Ex: Créneau Spécial"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Créneau personnalisé pour examens spéciaux"
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
          </CardContent>
        </Card>

        {/* Liste des créneaux */}
        <Card>
          <CardHeader>
            <CardTitle>Créneaux de surveillance</CardTitle>
            <CardDescription>
              Gérez les créneaux de surveillance pour la session {activeSession.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : creneaux.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Description</TableHead>
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
                        <Badge 
                          variant={creneau.type_creneau === 'standard' ? 'default' : 
                                  creneau.type_creneau === 'etendu' ? 'secondary' : 'outline'}
                        >
                          {creneau.type_creneau === 'standard' ? 'Standard' :
                           creneau.type_creneau === 'etendu' ? 'Étendu' : 'Manuel'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={creneau.is_validated ? "default" : "outline"}
                          className={creneau.is_validated ? "bg-green-100 text-green-800" : ""}
                        >
                          {creneau.is_validated ? "Validé" : "Brouillon"}
                        </Badge>
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
                                {creneau.is_validated ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
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
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun créneau trouvé. Générez des créneaux standards ou ajoutez-en manuellement.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
