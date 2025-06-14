import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, XCircle, Eye, Mail, Phone, BookOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useCandidatsSurveillance } from "@/hooks/candidatsSurveillance/useCandidatsSurveillance";
import { useCandidatDisponibilites } from "@/hooks/candidatsSurveillance/useCandidatDisponibilites";
import { useDemandesModification } from "@/hooks/candidatsSurveillance/useDemandesModification";
import { useUpdateTraiteCandidat } from "@/hooks/candidatsSurveillance/useUpdateTraiteCandidat";

export const CandidatsSurveillance = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedCandidat, setSelectedCandidat] = useState<any>(null);

  // Candidats de la session
  const { data: candidats, isLoading } = useCandidatsSurveillance(activeSession?.id);
  // Créneaux réels renseignés pour le candidat sélectionné
  const { data: disponibilites } = useCandidatDisponibilites({
    candidat: selectedCandidat
      ? {
          id: selectedCandidat.id,
          email: selectedCandidat.email,
          session_id: selectedCandidat.session_id,
        }
      : null,
  });

  // Demandes de modif pour le modal détail
  const { data: demandesModification } = useDemandesModification(selectedCandidat?.id);

  const updateTraiteMutation = useUpdateTraiteCandidat();

  // --- AJOUT debug/total creneaux ---
  // Récupérer le nombre total de créneaux pour la session (examens x horaires)
  // Utilisation d'une requête sur la table examens (pour la session active)
  const { data: totalCreneaux, isLoading: isLoadingCreneaux } = useQuery({
    queryKey: ['total-creneaux-session', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return 0;
      // chaque examen = 1 créneau à surveiller
      const { data, error } = await supabase
        .from('examens')
        .select('id')
        .eq('session_id', activeSession.id);

      if (error) {
        console.log("Erreur récupération examens pour session", error);
        return 0;
      }
      return (data || []).length;
    },
    enabled: !!activeSession?.id
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
                  {/* Ajout d'une colonne pour debug : creneaux attendus */}
                  <TableHead>Candidat</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Disponibilités</TableHead>
                  <TableHead className="text-center">Traité</TableHead>
                  <TableHead>Date candidature</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                  <TableHead className="text-center text-primary">Créneaux attendus (session)</TableHead>
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
                          {candidat.disponibilites_count || 0} créneau{(candidat.disponibilites_count || 0) > 1 ? "x" : ""}
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
                              <div>
                                <h4 className="text-base font-medium mb-2 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Disponibilités
                                </h4>
                                {disponibilites?.length ? (
                                  <div className="space-y-2">
                                    {disponibilites.map((dispo) => (
                                      <div key={dispo.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded">
                                        <div>
                                          <div className="font-medium">{dispo.date_examen}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {dispo.heure_debut} - {dispo.heure_fin}
                                          </div>
                                          <div className="text-xs mt-1">{dispo.matiere}</div>
                                          <div className="text-xs text-muted-foreground">{dispo.salle}</div>
                                          {dispo.nom_examen_obligatoire && (
                                            <div className="text-xs text-primary font-semibold">Surveillance obligatoire: {dispo.nom_examen_obligatoire}</div>
                                          )}
                                          {dispo.commentaire_surveillance_obligatoire && (
                                            <div className="text-xs text-primary">Commentaire: {dispo.commentaire_surveillance_obligatoire}</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">Aucune disponibilité enregistrée pour ce candidat.</div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-base font-medium mb-2 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  Demandes de modification info
                                </h4>
                                {demandesModification?.length ? (
                                  <div className="space-y-2">
                                    {demandesModification.map((demande) => (
                                      <div key={demande.id} className="p-3 border rounded">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-muted-foreground">{new Date(demande.created_at).toLocaleString('fr-FR')}</span>
                                          <Badge variant="outline">{demande.statut}</Badge>
                                        </div>
                                        <div className="mt-2 text-sm">{demande.commentaire || "(Pas de commentaire)"}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-sm">Aucune demande de modification trouvée pour ce candidat.</div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {isLoadingCreneaux ? "..." : totalCreneaux}
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
