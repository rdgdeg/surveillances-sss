
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link2, Unlink, Calendar, Clock } from "lucide-react";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian, formatTimeRange } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

export const ExamenCreneauAssociator = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedExamen, setSelectedExamen] = useState<string>("");
  const [selectedCreneau, setSelectedCreneau] = useState<string>("");

  // Récupérer tous les examens validés
  const { data: examens = [] } = useQuery({
    queryKey: ['examens-valides', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('examens')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer tous les créneaux validés
  const { data: creneaux = [] } = useQuery({
    queryKey: ['creneaux-valides', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Récupérer les associations existantes
  const { data: associations = [] } = useQuery({
    queryKey: ['creneaux-examens', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('creneaux_examens')
        .select(`
          *,
          examens (
            id, matiere, date_examen, heure_debut, heure_fin, salle
          ),
          creneaux_surveillance_config (
            id, nom_creneau, heure_debut, heure_fin
          )
        `)
        .eq('examens.session_id', activeSession.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour créer une association
  const createAssociationMutation = useMutation({
    mutationFn: async ({ examenId, creneauId }: { examenId: string; creneauId: string }) => {
      const { error } = await supabase
        .from('creneaux_examens')
        .insert({
          examen_id: examenId,
          creneau_id: creneauId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-examens'] });
      setSelectedExamen("");
      setSelectedCreneau("");
      toast({
        title: "Association créée",
        description: "L'examen a été associé au créneau avec succès.",
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

  // Mutation pour supprimer une association
  const deleteAssociationMutation = useMutation({
    mutationFn: async (associationId: string) => {
      const { error } = await supabase
        .from('creneaux_examens')
        .delete()
        .eq('id', associationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creneaux-examens'] });
      toast({
        title: "Association supprimée",
        description: "L'association a été supprimée avec succès.",
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

  const handleCreateAssociation = () => {
    if (!selectedExamen || !selectedCreneau) return;
    createAssociationMutation.mutate({
      examenId: selectedExamen,
      creneauId: selectedCreneau
    });
  };

  // Examens non encore associés
  const examensNonAssocies = examens.filter(examen => 
    !associations.some(assoc => assoc.examens?.id === examen.id)
  );

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Aucune session active. Activez une session pour gérer les associations examens-créneaux.
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
            <Link2 className="h-5 w-5" />
            <span>Association Examens - Créneaux</span>
          </CardTitle>
          <CardDescription>
            Session {activeSession.name} - Associez les examens aux créneaux de surveillance manuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Formulaire de création d'association */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-4">Créer une nouvelle association</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">Examen</label>
                  <Select value={selectedExamen} onValueChange={setSelectedExamen}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un examen" />
                    </SelectTrigger>
                    <SelectContent>
                      {examensNonAssocies.map((examen) => (
                        <SelectItem key={examen.id} value={examen.id}>
                          <div className="text-sm">
                            <div className="font-medium">{examen.matiere}</div>
                            <div className="text-gray-500">
                              {formatDateWithDayBelgian(examen.date_examen)} • {examen.heure_debut}-{examen.heure_fin} • {examen.salle}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Créneau</label>
                  <Select value={selectedCreneau} onValueChange={setSelectedCreneau}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un créneau" />
                    </SelectTrigger>
                    <SelectContent>
                      {creneaux.map((creneau) => (
                        <SelectItem key={creneau.id} value={creneau.id}>
                          <div className="text-sm">
                            <div className="font-medium">
                              {creneau.nom_creneau || formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                            </div>
                            <div className="text-gray-500">
                              {formatTimeRange(creneau.heure_debut, creneau.heure_fin)}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateAssociation}
                  disabled={!selectedExamen || !selectedCreneau || createAssociationMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Link2 className="h-4 w-4" />
                  <span>Associer</span>
                </Button>
              </div>
            </div>

            {/* Tableau des associations existantes */}
            <div>
              <h3 className="font-semibold mb-4">Associations existantes ({associations.length})</h3>
              {associations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Examen</TableHead>
                      <TableHead>Date & Heure</TableHead>
                      <TableHead>Salle</TableHead>
                      <TableHead>Créneau</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {associations.map((association) => (
                      <TableRow key={association.id}>
                        <TableCell>
                          <div className="font-medium">{association.examens?.matiere}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDateWithDayBelgian(association.examens?.date_examen || '')}</div>
                            <div className="text-gray-500">
                              {association.examens?.heure_debut} - {association.examens?.heure_fin}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{association.examens?.salle}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {association.creneaux_surveillance_config?.nom_creneau || 
                               formatTimeRange(
                                 association.creneaux_surveillance_config?.heure_debut || '',
                                 association.creneaux_surveillance_config?.heure_fin || ''
                               )}
                            </div>
                            <div className="text-gray-500">
                              {formatTimeRange(
                                association.creneaux_surveillance_config?.heure_debut || '',
                                association.creneaux_surveillance_config?.heure_fin || ''
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Unlink className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'association</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer l'association entre cet examen et ce créneau ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAssociationMutation.mutate(association.id)}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune association créée</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Commencez par associer vos examens aux créneaux de surveillance
                  </p>
                </div>
              )}
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{examens.length}</div>
                    <div className="text-sm text-blue-700">Examens validés</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{associations.length}</div>
                    <div className="text-sm text-green-700">Associations créées</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{examensNonAssocies.length}</div>
                    <div className="text-sm text-orange-700">Examens non associés</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
