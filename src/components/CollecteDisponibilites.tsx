
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { formatDateWithDayBelgian } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface ExamenAvecCreneau {
  id: string;
  matiere: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_surveillance: string;
  salle: string;
  nombre_surveillants: number;
  type_requis: string;
}

interface DisponibiliteForm {
  nom: string;
  prenom: string;
  email: string;
  disponibilites: Record<string, boolean>;
}

export const CollecteDisponibilites = () => {
  const { data: activeSession } = useActiveSession();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<DisponibiliteForm>({
    nom: '',
    prenom: '',
    email: '',
    disponibilites: {}
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Récupérer les examens validés avec leurs créneaux de surveillance
  const { data: examens = [], isLoading } = useQuery({
    queryKey: ['examens-valides-surveillance', activeSession?.id],
    queryFn: async (): Promise<ExamenAvecCreneau[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select(`
          id,
          matiere,
          date_examen,
          heure_debut,
          heure_fin,
          salle,
          nombre_surveillants,
          type_requis,
          creneaux_surveillance (
            heure_debut_surveillance,
            heure_fin_surveillance
          )
        `)
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen', { ascending: true })
        .order('heure_debut', { ascending: true });

      if (error) throw error;

      return data.map(examen => ({
        ...examen,
        heure_debut_surveillance: examen.creneaux_surveillance?.[0]?.heure_debut_surveillance || 
          // Calculer 45 minutes avant si pas de créneau défini
          new Date(`1970-01-01T${examen.heure_debut}`).getTime() - 45 * 60 * 1000 > 0 
            ? new Date(new Date(`1970-01-01T${examen.heure_debut}`).getTime() - 45 * 60 * 1000).toTimeString().slice(0, 5)
            : examen.heure_debut
      }));
    },
    enabled: !!activeSession?.id
  });

  // Mutation pour sauvegarder les disponibilités
  const saveDisponibilitesMutation = useMutation({
    mutationFn: async (data: DisponibiliteForm) => {
      if (!activeSession?.id) throw new Error('Aucune session active');

      // D'abord, vérifier si le surveillant existe ou le créer
      let { data: surveillant, error: surveillantError } = await supabase
        .from('surveillants')
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (surveillantError && surveillantError.code !== 'PGRST116') {
        throw surveillantError;
      }

      let surveillantId;

      if (!surveillant) {
        // Créer le surveillant s'il n'existe pas
        const { data: newSurveillant, error: createError } = await supabase
          .from('surveillants')
          .insert({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            type: 'Candidat',
            statut: 'candidat'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        surveillantId = newSurveillant.id;
      } else {
        surveillantId = surveillant.id;
      }

      // Supprimer les disponibilités existantes pour cette session
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);

      // Insérer les nouvelles disponibilités
      const disponibilitesToInsert = Object.entries(data.disponibilites)
        .filter(([_, isAvailable]) => isAvailable)
        .map(([examenId, _]) => {
          const examen = examens.find(e => e.id === examenId);
          if (!examen) return null;

          return {
            surveillant_id: surveillantId,
            session_id: activeSession.id,
            date_examen: examen.date_examen,
            heure_debut: examen.heure_debut_surveillance,
            heure_fin: examen.heure_fin,
            est_disponible: true
          };
        })
        .filter(Boolean);

      if (disponibilitesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('disponibilites')
          .insert(disponibilitesToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Disponibilités enregistrées",
        description: "Merci ! Vos disponibilités ont été enregistrées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer vos disponibilités.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.email) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    const selectedCount = Object.values(formData.disponibilites).filter(Boolean).length;
    if (selectedCount === 0) {
      toast({
        title: "Aucune disponibilité sélectionnée",
        description: "Veuillez sélectionner au moins un créneau de disponibilité.",
        variant: "destructive"
      });
      return;
    }

    saveDisponibilitesMutation.mutate(formData);
  };

  const handleDisponibiliteChange = (examenId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      disponibilites: {
        ...prev.disponibilites,
        [examenId]: checked
      }
    }));
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            Aucune session d'examens active pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse text-center">
            Chargement des créneaux d'examens...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Merci !
          </h2>
          <p className="text-gray-600 mb-4">
            Vos disponibilités ont été enregistrées avec succès.
          </p>
          <p className="text-sm text-gray-500">
            Vous recevrez une confirmation par email si vous êtes sélectionné(e) pour la surveillance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedCount = Object.values(formData.disponibilites).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6" />
            <span>Collecte des Disponibilités - Session {activeSession.name}</span>
          </CardTitle>
          <CardDescription>
            Veuillez indiquer vos disponibilités pour la surveillance des examens. 
            Les horaires incluent le temps de préparation (45 minutes avant chaque examen).
          </CardDescription>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vos informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste des créneaux */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Créneaux de surveillance disponibles</span>
              <Badge variant="outline">
                {selectedCount} créneau{selectedCount !== 1 ? 'x' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <CardDescription>
              Cochez les créneaux où vous êtes disponible pour surveiller des examens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examens.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Aucun examen validé pour cette session.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {examens.map((examen) => (
                  <div
                    key={examen.id}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`examen-${examen.id}`}
                      checked={formData.disponibilites[examen.id] || false}
                      onCheckedChange={(checked) => 
                        handleDisponibiliteChange(examen.id, !!checked)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <label
                        htmlFor={`examen-${examen.id}`}
                        className="block cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline">
                            {formatDateWithDayBelgian(examen.date_examen)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{examen.heure_debut_surveillance} - {examen.heure_fin}</span>
                          </Badge>
                          <Badge>
                            {examen.type_requis} requis
                          </Badge>
                        </div>
                        <h4 className="font-medium text-gray-900">
                          {examen.matiere}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Salle : {examen.salle} • {examen.nombre_surveillants} surveillant{examen.nombre_surveillants !== 1 ? 's' : ''} requis
                        </p>
                        <p className="text-xs text-gray-500">
                          Surveillance de {examen.heure_debut_surveillance} à {examen.heure_fin} 
                          (examen : {examen.heure_debut} - {examen.heure_fin})
                        </p>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bouton de soumission */}
        {examens.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Button
                  type="submit"
                  disabled={saveDisponibilitesMutation.isPending}
                  className="w-full md:w-auto px-8"
                >
                  {saveDisponibilitesMutation.isPending 
                    ? "Enregistrement..." 
                    : "Enregistrer mes disponibilités"
                  }
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  Vous pourrez modifier vos disponibilités en utilisant à nouveau ce lien.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
};
