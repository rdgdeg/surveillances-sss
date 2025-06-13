
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserCheck, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CandidatSurveillance {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  statut: string;
  statut_autre: string | null;
  traite: boolean;
  created_at: string;
}

export const CandidatsSurveillance = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();

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
      return data || [];
    },
    enabled: !!activeSession?.id
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
        title: "Statut mis à jour",
        description: "Le statut de traitement a été mis à jour.",
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

  const createSurveillantMutation = useMutation({
    mutationFn: async (candidat: CandidatSurveillance) => {
      // Créer le surveillant
      const { data: surveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .insert({
          nom: candidat.nom,
          prenom: candidat.prenom,
          email: candidat.email,
          telephone: candidat.telephone,
          type: candidat.statut === 'Autre' && candidat.statut_autre ? candidat.statut_autre : candidat.statut,
          statut: 'actif'
        })
        .select()
        .single();

      if (surveillantError) throw surveillantError;

      // Créer la relation avec la session active
      if (activeSession?.id) {
        const { error: sessionError } = await supabase
          .from('surveillant_sessions')
          .insert({
            surveillant_id: surveillant.id,
            session_id: activeSession.id,
            quota: 6, // quota par défaut
            is_active: true
          });

        if (sessionError) throw sessionError;
      }

      // Marquer le candidat comme traité
      const { error: updateError } = await supabase
        .from('candidats_surveillance')
        .update({ traite: true })
        .eq('id', candidat.id);

      if (updateError) throw updateError;

      return surveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidats-surveillance'] });
      toast({
        title: "Surveillant créé",
        description: "Le candidat a été converti en surveillant avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le surveillant.",
        variant: "destructive"
      });
    }
  });

  const copyCollectionUrl = () => {
    const url = `${window.location.origin}/collecte-surveillants`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiée",
      description: "L'URL de collecte a été copiée dans le presse-papiers.",
    });
  };

  const openCollectionUrl = () => {
    window.open('/collecte-surveillants', '_blank');
  };

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
          <p className="text-center">Chargement des candidats...</p>
        </CardContent>
      </Card>
    );
  }

  const candidatsNonTraites = candidats?.filter(c => !c.traite) || [];
  const candidatsTraites = candidats?.filter(c => c.traite) || [];

  return (
    <div className="space-y-6">
      {/* Interface de collecte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Interface de Collecte</span>
          </CardTitle>
          <CardDescription>
            Partagez cette URL avec les surveillants potentiels pour qu'ils puissent s'inscrire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button onClick={copyCollectionUrl} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copier l'URL de collecte
            </Button>
            <Button onClick={openCollectionUrl} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir l'interface
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            URL: {window.location.origin}/collecte-surveillants
          </p>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidatures reçues</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{candidats?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À traiter</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{candidatsNonTraites.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traitées</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{candidatsTraites.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Candidatures non traitées */}
      {candidatsNonTraites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Candidatures à traiter</CardTitle>
            <CardDescription>
              Nouvelles candidatures en attente de traitement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatsNonTraites.map((candidat) => (
                  <TableRow key={candidat.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{candidat.nom} {candidat.prenom}</div>
                        <div className="text-sm text-muted-foreground">{candidat.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {candidat.statut === 'Autre' && candidat.statut_autre 
                          ? candidat.statut_autre 
                          : candidat.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{candidat.email}</div>
                        {candidat.telephone && (
                          <div className="text-muted-foreground">{candidat.telephone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(candidat.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => createSurveillantMutation.mutate(candidat)}
                          disabled={createSurveillantMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Créer Surveillant
                        </Button>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={candidat.traite}
                            onCheckedChange={(checked) => 
                              updateTraiteMutation.mutate({ 
                                candidatId: candidat.id, 
                                traite: !!checked 
                              })
                            }
                          />
                          <span className="text-sm">Traité</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Candidatures traitées */}
      {candidatsTraites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Candidatures traitées</CardTitle>
            <CardDescription>
              Candidatures qui ont été traitées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatsTraites.map((candidat) => (
                  <TableRow key={candidat.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{candidat.nom} {candidat.prenom}</div>
                        <div className="text-sm text-muted-foreground">{candidat.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {candidat.statut === 'Autre' && candidat.statut_autre 
                          ? candidat.statut_autre 
                          : candidat.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{candidat.email}</div>
                        {candidat.telephone && (
                          <div className="text-muted-foreground">{candidat.telephone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(candidat.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Checkbox
                          checked={candidat.traite}
                          onCheckedChange={(checked) => 
                            updateTraiteMutation.mutate({ 
                              candidatId: candidat.id, 
                              traite: !!checked 
                            })
                          }
                        />
                        <span className="text-sm">Traité</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
