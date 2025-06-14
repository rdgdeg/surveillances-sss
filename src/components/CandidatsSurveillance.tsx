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
  session_id?: string; // <-- Fix: Add session_id to match DB and usage
}

// Pour afficher les dispos par surveillant (en se basant sur email)
interface DisponibiliteDetail {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
  commentaire_surveillance_obligatoire?: string;
  nom_examen_obligatoire?: string;
}

// Pour afficher les demandes de modif
interface DemandeModification {
  id: string;
  commentaire: string | null;
  statut: string | null;
  created_at: string;
}

export const CandidatsSurveillance = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedCandidat, setSelectedCandidat] = useState<CandidatSurveillance | null>(null);

  // 1. Charger tous les candidats pour la session
  const { data: candidats, isLoading } = useQuery({
    queryKey: ['candidats-surveillance', activeSession?.id],
    queryFn: async (): Promise<CandidatSurveillance[]> => {
      if (!activeSession?.id) return [];
      const { data, error } = await supabase
        .from('candidats_surveillance')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pour chaque candidat, on recompte les dispos à partir de la table disponibilites
      const candidatsWithCount = await Promise.all(
        (data || []).map(async (candidat) => {
          // Chercher le surveillant lié à l'email (même celui qui aurait été créé par le public)
          const { data: surveillant, error: surveillantErr } = await supabase
            .from('surveillants')
            .select('id, email')
            .eq('email', candidat.email?.trim())
            .maybeSingle();

          if (surveillantErr) {
            console.log('Erreur de recherche surveillant', surveillantErr);
          }
          let count = 0;
          if (surveillant) {
            const { count: dispoCount, error: dispoErr } = await supabase
              .from('disponibilites')
              .select('id', { count: 'exact', head: true })
              .eq('surveillant_id', surveillant.id)
              .eq('session_id', candidat.session_id);
            if (dispoErr) {
              console.log('Erreur de recherche disponibilites', dispoErr);
            }
            count = dispoCount ?? 0;
          } else {
            // Log surveillant non trouvé pour debug (nom, email ?)
            console.log(`Aucun surveillant trouvé pour: ${candidat.prenom} ${candidat.nom} <${candidat.email}>`);
          }
          return { ...candidat, disponibilites_count: count };
        })
      );
      return candidatsWithCount;
    },
    enabled: !!activeSession?.id
  });

  // 2. Charger les créneaux de disponibilités réels du candidat sélectionné
  const { data: disponibilites } = useQuery({
    queryKey: ['candidat-disponibilites', selectedCandidat?.id, selectedCandidat?.email, selectedCandidat?.session_id],
    queryFn: async (): Promise<DisponibiliteDetail[]> => {
      if (!selectedCandidat?.id) return [];
      // Chercher le surveillant lié à l'email (parfois fails si espace/casse)
      const { data: surveillant } = await supabase
        .from('surveillants')
        .select('id, email')
        .eq('email', selectedCandidat.email?.trim())
        .maybeSingle();
      if (!surveillant) {
        console.log(`Surveillant non trouvé (detail) pour ${selectedCandidat.prenom} ${selectedCandidat.nom} <${selectedCandidat.email}>`);
        return [];
      }
      const { data, error } = await supabase
        .from('disponibilites')
        .select(`
          *,
          examens(date_examen, heure_debut, heure_fin, matiere, salle)
        `)
        .eq('surveillant_id', surveillant.id)
        .eq('session_id', selectedCandidat.session_id)
        .eq('est_disponible', true);

      if (error) {
        console.log('Erreur chargement disponibilites depuis disponibilites', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        date_examen: row.examens?.date_examen,
        heure_debut: row.examens?.heure_debut,
        heure_fin: row.examens?.heure_fin,
        matiere: row.examens?.matiere,
        salle: row.examens?.salle,
        commentaire_surveillance_obligatoire: row.commentaire_surveillance_obligatoire || undefined,
        nom_examen_obligatoire: row.nom_examen_obligatoire || undefined
      }));
    },
    enabled: !!selectedCandidat?.id && !!selectedCandidat?.session_id && !!selectedCandidat?.email
  });

  // 3. Charger les demandes de modification info associées à ce candidat
  const { data: demandesModification } = useQuery({
    queryKey: ['demandes-modification', selectedCandidat?.id],
    queryFn: async (): Promise<DemandeModification[]> => {
      if (!selectedCandidat?.id) return [];
      // La table "demandes_modification_info" fait ref soit sur le surveillant, soit sur le candidat.
      // On va chercher via candidat_id
      const { data, error } = await supabase
        .from('demandes_modification_info')
        .select('*')
        .eq('candidat_id', selectedCandidat.id)
        .order('created_at', { ascending: false });
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
