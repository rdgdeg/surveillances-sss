
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserMinus, UserPlus, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveSession } from "@/hooks/useSessions";

interface SurveillantSession {
  id: string;
  surveillant_id: string;
  quota: number;
  is_active: boolean;
  remarques_desactivation: string | null;
  date_desactivation: string | null;
  surveillants: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    type: string;
    faculte_interdite: string | null;
  };
}

export const SurveillantAdvancedManager = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  const [selectedSurveillant, setSelectedSurveillant] = useState<SurveillantSession | null>(null);
  const [remarqueDesactivation, setRemarqueDesactivation] = useState("");
  const [nouveauQuota, setNouveauQuota] = useState<number>(0);

  const { data: surveillantSessions, isLoading } = useQuery({
    queryKey: ['surveillant-sessions-advanced', activeSession?.id],
    queryFn: async (): Promise<SurveillantSession[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('surveillant_sessions')
        .select(`
          id,
          surveillant_id,
          quota,
          is_active,
          remarques_desactivation,
          date_desactivation,
          surveillants!inner(
            id,
            nom,
            prenom,
            email,
            type,
            faculte_interdite
          )
        `)
        .eq('session_id', activeSession.id)
        .order('surveillants(nom)', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const desactiverSurveillantMutation = useMutation({
    mutationFn: async ({ surveillantSessionId, remarque }: { surveillantSessionId: string; remarque: string }) => {
      const { error } = await supabase
        .from('surveillant_sessions')
        .update({
          quota: 0,
          remarques_desactivation: remarque,
          date_desactivation: new Date().toISOString()
        })
        .eq('id', surveillantSessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillant-sessions-advanced'] });
      setSelectedSurveillant(null);
      setRemarqueDesactivation("");
      toast({
        title: "Surveillant désactivé",
        description: "Le quota a été mis à 0 avec remarque enregistrée.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de désactiver le surveillant.",
        variant: "destructive"
      });
    }
  });

  const reactiverSurveillantMutation = useMutation({
    mutationFn: async ({ surveillantSessionId, quota }: { surveillantSessionId: string; quota: number }) => {
      const { error } = await supabase
        .from('surveillant_sessions')
        .update({
          quota: quota,
          remarques_desactivation: null,
          date_desactivation: null
        })
        .eq('id', surveillantSessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillant-sessions-advanced'] });
      setSelectedSurveillant(null);
      setNouveauQuota(0);
      toast({
        title: "Surveillant réactivé",
        description: "Le quota a été restauré et les remarques effacées.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réactiver le surveillant.",
        variant: "destructive"
      });
    }
  });

  const handleDesactivation = (surveillant: SurveillantSession) => {
    setSelectedSurveillant(surveillant);
    setRemarqueDesactivation("");
  };

  const handleReactivation = (surveillant: SurveillantSession) => {
    setSelectedSurveillant(surveillant);
    // Suggérer un quota par défaut basé sur le type
    const quotaDefaut = surveillant.surveillants.type === 'PAT' ? 12 : 6;
    setNouveauQuota(quotaDefaut);
  };

  const confirmerDesactivation = () => {
    if (!selectedSurveillant || !remarqueDesactivation.trim()) {
      toast({
        title: "Remarque obligatoire",
        description: "Veuillez saisir une remarque expliquant la désactivation.",
        variant: "destructive"
      });
      return;
    }

    desactiverSurveillantMutation.mutate({
      surveillantSessionId: selectedSurveillant.id,
      remarque: remarqueDesactivation.trim()
    });
  };

  const confirmerReactivation = () => {
    if (!selectedSurveillant || nouveauQuota <= 0) {
      toast({
        title: "Quota invalide",
        description: "Veuillez saisir un quota valide (supérieur à 0).",
        variant: "destructive"
      });
      return;
    }

    reactiverSurveillantMutation.mutate({
      surveillantSessionId: selectedSurveillant.id,
      quota: nouveauQuota
    });
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
          <p className="text-center">Chargement des surveillants...</p>
        </CardContent>
      </Card>
    );
  }

  const surveillantsActifs = surveillantSessions?.filter(s => s.quota > 0) || [];
  const surveillantsDesactives = surveillantSessions?.filter(s => s.quota === 0) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserMinus className="h-5 w-5" />
            <span>Gestion Avancée des Surveillants</span>
          </CardTitle>
          <CardDescription>
            Désactivation temporaire avec mise à quota 0 et remarques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Surveillants actifs */}
            <div>
              <h3 className="font-semibold text-green-700 mb-3">Surveillants actifs ({surveillantsActifs.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {surveillantsActifs.map((surveillant) => (
                  <div key={surveillant.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {surveillant.surveillants.nom} {surveillant.surveillants.prenom}
                        </span>
                        <Badge variant="secondary">{surveillant.surveillants.type}</Badge>
                        {surveillant.surveillants.faculte_interdite && (
                          <Badge variant="outline" className="text-xs bg-yellow-100">
                            Interdit: {surveillant.surveillants.faculte_interdite}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{surveillant.surveillants.email}</p>
                      <p className="text-sm font-medium text-green-700">Quota: {surveillant.quota}</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDesactivation(surveillant)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Désactiver temporairement</DialogTitle>
                          <DialogDescription>
                            Mettre le quota à 0 pour {surveillant.surveillants.nom} {surveillant.surveillants.prenom}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="remarque">Remarque (obligatoire)</Label>
                            <Textarea
                              id="remarque"
                              placeholder="Raison de la désactivation (ex: congé maladie, conflit d'horaires...)"
                              value={remarqueDesactivation}
                              onChange={(e) => setRemarqueDesactivation(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            <p className="text-sm text-orange-800">
                              Le quota sera mis à 0. Les remarques permettront de reporter le quota sur une autre session.
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setSelectedSurveillant(null)}>
                              Annuler
                            </Button>
                            <Button 
                              onClick={confirmerDesactivation}
                              disabled={desactiverSurveillantMutation.isPending}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Confirmer la désactivation
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </div>

            {/* Surveillants désactivés */}
            <div>
              <h3 className="font-semibold text-orange-700 mb-3">Surveillants désactivés ({surveillantsDesactives.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {surveillantsDesactives.map((surveillant) => (
                  <div key={surveillant.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {surveillant.surveillants.nom} {surveillant.surveillants.prenom}
                        </span>
                        <Badge variant="secondary">{surveillant.surveillants.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{surveillant.surveillants.email}</p>
                      <p className="text-sm font-medium text-orange-700">Quota: 0 (désactivé)</p>
                      {surveillant.remarques_desactivation && (
                        <p className="text-xs text-orange-600 mt-1">
                          Remarque: {surveillant.remarques_desactivation}
                        </p>
                      )}
                      {surveillant.date_desactivation && (
                        <p className="text-xs text-gray-500">
                          Désactivé le: {new Date(surveillant.date_desactivation).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReactivation(surveillant)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Réactiver le surveillant</DialogTitle>
                          <DialogDescription>
                            Restaurer le quota pour {surveillant.surveillants.nom} {surveillant.surveillants.prenom}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nouveau-quota">Nouveau quota</Label>
                            <Input
                              id="nouveau-quota"
                              type="number"
                              min="1"
                              value={nouveauQuota}
                              onChange={(e) => setNouveauQuota(parseInt(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                          {surveillant.remarques_desactivation && (
                            <div className="p-3 bg-gray-50 border rounded-lg">
                              <p className="text-sm font-medium text-gray-700">Remarque précédente:</p>
                              <p className="text-sm text-gray-600 mt-1">{surveillant.remarques_desactivation}</p>
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setSelectedSurveillant(null)}>
                              Annuler
                            </Button>
                            <Button 
                              onClick={confirmerReactivation}
                              disabled={reactiverSurveillantMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Réactiver
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {surveillantSessions && surveillantSessions.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Aucun surveillant trouvé pour cette session.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
