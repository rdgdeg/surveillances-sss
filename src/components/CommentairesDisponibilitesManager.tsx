
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Eye, EyeOff, Calendar, User, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { formatDateBelgian } from "@/lib/dateUtils";

interface CommentaireDisponibilite {
  id: string;
  session_id: string;
  surveillant_id: string | null;
  email: string;
  nom: string;
  prenom: string;
  message: string;
  statut: 'NON_LU' | 'LU';
  lu_par: string | null;
  lu_le: string | null;
  created_at: string;
}

export const CommentairesDisponibilitesManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [filtreStatut, setFiltreStatut] = useState<'TOUS' | 'NON_LU' | 'LU'>('TOUS');

  // Récupérer les commentaires
  const { data: commentaires = [], isLoading } = useQuery({
    queryKey: ['commentaires-disponibilites', activeSession?.id, filtreStatut],
    queryFn: async (): Promise<CommentaireDisponibilite[]> => {
      if (!activeSession?.id) return [];

      let query = supabase
        .from('commentaires_disponibilites')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false });

      if (filtreStatut !== 'TOUS') {
        query = query.eq('statut', filtreStatut);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Marquer comme lu/non lu
  const marquerStatutMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: 'LU' | 'NON_LU' }) => {
      const updateData: any = { statut };
      
      if (statut === 'LU') {
        updateData.lu_par = 'admin'; // Vous pouvez adapter selon votre système d'auth
        updateData.lu_le = new Date().toISOString();
      } else {
        updateData.lu_par = null;
        updateData.lu_le = null;
      }

      const { error } = await supabase
        .from('commentaires_disponibilites')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentaires-disponibilites'] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du commentaire a été modifié.",
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
        <CardContent className="p-6 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune session active. Veuillez d'abord activer une session.</p>
        </CardContent>
      </Card>
    );
  }

  const commentairesNonLus = commentaires.filter(c => c.statut === 'NON_LU').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span>Commentaires des Surveillants - {activeSession.name}</span>
            {commentairesNonLus > 0 && (
              <Badge variant="destructive">{commentairesNonLus} non lus</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Gérez les commentaires laissés par les surveillants lors de leur soumission de disponibilités.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-6">
            <Button
              variant={filtreStatut === 'TOUS' ? 'default' : 'outline'}
              onClick={() => setFiltreStatut('TOUS')}
              size="sm"
            >
              Tous ({commentaires.length})
            </Button>
            <Button
              variant={filtreStatut === 'NON_LU' ? 'default' : 'outline'}
              onClick={() => setFiltreStatut('NON_LU')}
              size="sm"
            >
              Non lus ({commentairesNonLus})
            </Button>
            <Button
              variant={filtreStatut === 'LU' ? 'default' : 'outline'}
              onClick={() => setFiltreStatut('LU')}
              size="sm"
            >
              Lus ({commentaires.filter(c => c.statut === 'LU').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-pulse">Chargement des commentaires...</div>
          </CardContent>
        </Card>
      ) : commentaires.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {filtreStatut === 'TOUS' ? 'Aucun commentaire' : `Aucun commentaire ${filtreStatut.toLowerCase().replace('_', ' ')}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {commentaires.map((commentaire) => (
            <Card 
              key={commentaire.id} 
              className={commentaire.statut === 'NON_LU' ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {commentaire.prenom} {commentaire.nom}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{commentaire.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatDateBelgian(commentaire.created_at.split('T')[0])} à {commentaire.created_at.split('T')[1].substring(0, 5)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={commentaire.statut === 'NON_LU' ? 'destructive' : 'secondary'}>
                      {commentaire.statut === 'NON_LU' ? 'Non lu' : 'Lu'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => marquerStatutMutation.mutate({
                        id: commentaire.id,
                        statut: commentaire.statut === 'NON_LU' ? 'LU' : 'NON_LU'
                      })}
                      disabled={marquerStatutMutation.isPending}
                    >
                      {commentaire.statut === 'NON_LU' ? (
                        <><Eye className="h-4 w-4 mr-1" /> Marquer lu</>
                      ) : (
                        <><EyeOff className="h-4 w-4 mr-1" /> Marquer non lu</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-gray-800 whitespace-pre-wrap">{commentaire.message}</p>
                </div>
                {commentaire.statut === 'LU' && commentaire.lu_le && (
                  <div className="mt-3 text-xs text-gray-500">
                    Lu le {formatDateBelgian(commentaire.lu_le.split('T')[0])} à {commentaire.lu_le.split('T')[1].substring(0, 5)}
                    {commentaire.lu_par && ` par ${commentaire.lu_par}`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
