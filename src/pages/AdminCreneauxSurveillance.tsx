import { useState, useEffect } from "react";
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

interface CreneauGenere {
  id: string;
  date_surveillance: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau: string;
  description: string;
  examens_couverts: any[];
  nb_examens: number;
  nb_surveillants_requis: number;
  statut: 'GENERE' | 'VALIDE' | 'REJETE';
  is_manual: boolean;
  genere_le: string;
  valide_le?: string;
  valide_par?: string;
  notes_admin?: string;
}

export default function AdminCreneauxSurveillance() {
  const queryClient = useQueryClient();
  const { data: sessions } = useSessions();
  const activeSession = sessions?.find(s => s.is_active);
  
  const [selectedCreneau, setSelectedCreneau] = useState<CreneauGenere | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCreneau, setEditingCreneau] = useState<CreneauGenere | null>(null);

  // Récupérer les créneaux générés
  const { data: creneaux = [], isLoading } = useQuery({
    queryKey: ['creneaux-surveillance-generated', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('creneaux_surveillance_generated')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('date_surveillance')
        .order('heure_debut');
      
      if (error) throw error;
      return data as CreneauGenere[];
    },
    enabled: !!activeSession?.id
  });

  // Générer automatiquement les créneaux
  const genererCreneauxMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) throw new Error('Aucune session active');
      
      const { data, error } = await supabase.rpc('generer_creneaux_surveillance', {
        p_session_id: activeSession.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (nbCreneaux) => {
      toast({
        title: "Créneaux générés",
        description: `${nbCreneaux} créneau(x) ont été générés automatiquement.`
      });
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-generated'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Valider/Rejeter un créneau
  const updateStatutMutation = useMutation({
    mutationFn: async ({ id, statut, notes }: { id: string; statut: 'VALIDE' | 'REJETE'; notes?: string }) => {
      const { error } = await supabase
        .from('creneaux_surveillance_generated')
        .update({
          statut,
          valide_le: new Date().toISOString(),
          valide_par: 'admin', // TODO: récupérer l'utilisateur connecté
          notes_admin: notes
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut du créneau a été mis à jour."
      });
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-generated'] });
    }
  });

  // Supprimer un créneau
  const supprimerCreneauMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creneaux_surveillance_generated')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Créneau supprimé",
        description: "Le créneau a été supprimé avec succès."
      });
      queryClient.invalidateQueries({ queryKey: ['creneaux-surveillance-generated'] });
    }
  });

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'GENERE':
        return <Badge variant="secondary">Généré</Badge>;
      case 'VALIDE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Validé</Badge>;
      case 'REJETE':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const creneauxParDate = creneaux.reduce((acc, creneau) => {
    const date = creneau.date_surveillance;
    if (!acc[date]) acc[date] = [];
    acc[date].push(creneau);
    return acc;
  }, {} as Record<string, CreneauGenere[]>);

  const statsCreneaux = {
    total: creneaux.length,
    generes: creneaux.filter(c => c.statut === 'GENERE').length,
    valides: creneaux.filter(c => c.statut === 'VALIDE').length,
    rejetes: creneaux.filter(c => c.statut === 'REJETE').length,
    manuels: creneaux.filter(c => c.is_manual).length
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Gestion des Créneaux de Surveillance</h1>
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
                <div className="text-2xl font-bold text-orange-600">{statsCreneaux.generes}</div>
                <p className="text-xs text-muted-foreground">Générés</p>
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
                <div className="text-2xl font-bold text-red-600">{statsCreneaux.rejetes}</div>
                <p className="text-xs text-muted-foreground">Rejetés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statsCreneaux.manuels}</div>
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
              <span>Actions de Gestion</span>
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
                {genererCreneauxMutation.isPending ? 'Génération...' : 'Générer les créneaux'}
              </span>
            </Button>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter manuellement</span>
            </Button>
          </CardContent>
        </Card>

        {/* Liste des créneaux par date */}
        {isLoading ? (
          <div className="text-center py-8">Chargement des créneaux...</div>
        ) : Object.keys(creneauxParDate).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun créneau généré. Cliquez sur "Générer les créneaux" pour commencer.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(creneauxParDate).map(([date, creneauxDate]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDateBelgian(date)}</span>
                  <Badge variant="outline">{creneauxDate.length} créneau(x)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creneauxDate.map((creneau) => (
                    <div
                      key={creneau.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                            </span>
                          </div>
                          
                          {getStatutBadge(creneau.statut)}
                          
                          {creneau.is_manual && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Manuel
                            </Badge>
                          )}
                          
                          <div className="text-sm text-muted-foreground">
                            {creneau.nb_examens} examen(s) • {creneau.nb_surveillants_requis} surveillant(s)
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCreneau(creneau);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {creneau.statut === 'GENERE' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatutMutation.mutate({ id: creneau.id, statut: 'VALIDE' })}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatutMutation.mutate({ id: creneau.id, statut: 'REJETE' })}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCreneau(creneau)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => supprimerCreneauMutation.mutate(creneau.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      {creneau.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {creneau.description}
                        </p>
                      )}
                      
                      {creneau.notes_admin && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <strong>Notes admin :</strong> {creneau.notes_admin}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Dialog de détails */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Détails du Créneau</DialogTitle>
              <DialogDescription>
                {selectedCreneau && formatDateBelgian(selectedCreneau.date_surveillance)} • {selectedCreneau && formatTimeRange(selectedCreneau.heure_debut, selectedCreneau.heure_fin)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedCreneau && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Statut</Label>
                    <div className="mt-1">{getStatutBadge(selectedCreneau.statut)}</div>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <div className="mt-1">
                      <Badge variant={selectedCreneau.is_manual ? "default" : "secondary"}>
                        {selectedCreneau.is_manual ? "Manuel" : "Généré automatiquement"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Examens couverts ({selectedCreneau.nb_examens})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedCreneau.examens_couverts.map((examen: any, index: number) => (
                      <div key={index} className="border rounded p-3 text-sm">
                        <div className="font-medium">{examen.code_examen}</div>
                        <div className="text-muted-foreground">{examen.matiere}</div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span>Salle: {examen.salle}</span>
                          <span>Horaire: {formatTimeRange(examen.heure_debut, examen.heure_fin)}</span>
                          <span>Surveillants: {examen.nombre_surveillants}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedCreneau.notes_admin && (
                  <div>
                    <Label>Notes administrateur</Label>
                    <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      {selectedCreneau.notes_admin}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}