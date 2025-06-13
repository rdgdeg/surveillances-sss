
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Eye, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CandidatSurveillance {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  statut: string;
  statut_autre?: string;
  traite: boolean;
  created_at: string;
  disponibilites_count?: number;
}

export const CandidatsSurveillance = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatSurveillance | null>(null);

  const { data: candidats, isLoading } = useQuery({
    queryKey: ['candidats-surveillance', activeSession?.id],
    queryFn: async (): Promise<CandidatSurveillance[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('candidats_surveillance')
        .select(`
          *,
          candidats_disponibilites(count)
        `)
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(candidat => ({
        ...candidat,
        disponibilites_count: candidat.candidats_disponibilites?.[0]?.count || 0
      }));
    },
    enabled: !!activeSession?.id
  });

  const { data: disponibilites } = useQuery({
    queryKey: ['candidat-disponibilites', selectedCandidat?.id],
    queryFn: async () => {
      if (!selectedCandidat?.id) return [];

      const { data, error } = await supabase
        .from('candidats_disponibilites')
        .select(`
          *,
          examens(date_examen, heure_debut, heure_fin, matiere, salle)
        `)
        .eq('candidat_id', selectedCandidat.id)
        .eq('est_disponible', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCandidat?.id
  });

  const updateTraiteMutation = useMutation({
    mutationFn: async ({ candidatId, traite }: { candidatId: string; traite: boolean }) => {
      const { error } = await supabase
        .from('candidats_surveillance')
        .update({ traite })
        .eq('id', candidatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidats-surveillance'] });
      toast({
        title: "Succès",
        description: "Statut mis à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  });

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
          <p className="text-center">Chargement des candidatures...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Candidats Surveillance</span>
          </CardTitle>
          <CardDescription>
            Gestion des candidatures pour la surveillance d'examens - Session {activeSession.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{candidats?.length || 0}</div>
              <div className="text-sm text-blue-600">Total candidatures</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {candidats?.filter(c => c.traite).length || 0}
              </div>
              <div className="text-sm text-green-600">Traitées</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {candidats?.filter(c => !c.traite).length || 0}
              </div>
              <div className="text-sm text-orange-600">En attente</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Disponibilités</TableHead>
                  <TableHead className="text-center">Traité</TableHead>
                  <TableHead>Date candidature</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidats?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune candidature pour cette session
                    </TableCell>
                  </TableRow>
                ) : (
                  candidats?.map((candidat) => (
                    <TableRow key={candidat.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{candidat.prenom} {candidat.nom}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{candidat.email}</span>
                          </div>
                          {candidat.telephone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span className="text-xs">{candidat.telephone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {candidat.statut === 'Autre' ? candidat.statut_autre : candidat.statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {candidat.disponibilites_count || 0} créneaux
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTraiteMutation.mutate({
                            candidatId: candidat.id,
                            traite: !candidat.traite
                          })}
                          disabled={updateTraiteMutation.isPending}
                        >
                          {candidat.traite ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(candidat.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCandidat(candidat)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Détails - {candidat.prenom} {candidat.nom}
                              </DialogTitle>
                              <DialogDescription>
                                Disponibilités déclarées par le candidat
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {disponibilites?.map((dispo) => (
                                <div key={dispo.id} className="flex items-center justify-between p-3 border rounded">
                                  <div>
                                    <div className="font-medium">{dispo.examens?.date_examen}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {dispo.examens?.heure_debut} - {dispo.examens?.heure_fin}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm">{dispo.examens?.matiere}</div>
                                    <div className="text-xs text-muted-foreground">{dispo.examens?.salle}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
