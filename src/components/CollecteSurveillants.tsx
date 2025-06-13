
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserPlus, ExternalLink, BookOpen, HelpCircle, Users, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExamenSlot {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
}

export const CollecteSurveillants = () => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    statut: '',
    statut_autre: '',
    disponibilites: {} as Record<string, boolean>
  });

  const [submitted, setSubmitted] = useState(false);

  // Récupérer la session active pour afficher les créneaux
  const { data: activeSession } = useQuery({
    queryKey: ['active-session-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const { data: examens } = useQuery({
    queryKey: ['examens-public', activeSession?.id],
    queryFn: async (): Promise<ExamenSlot[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle')
        .eq('session_id', activeSession.id)
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  const submitMutation = useMutation({
    mutationFn: async (candidatData: typeof formData) => {
      // Insérer le candidat
      const { data: candidat, error: candidatError } = await supabase
        .from('candidats_surveillance')
        .insert({
          nom: candidatData.nom,
          prenom: candidatData.prenom,
          email: candidatData.email,
          telephone: candidatData.telephone,
          statut: candidatData.statut,
          statut_autre: candidatData.statut === 'Autre' ? candidatData.statut_autre : null,
          session_id: activeSession?.id
        })
        .select()
        .single();

      if (candidatError) throw candidatError;

      // Insérer les disponibilités
      const disponibilites = Object.entries(candidatData.disponibilites)
        .filter(([_, isAvailable]) => isAvailable)
        .map(([examenId]) => ({
          candidat_id: candidat.id,
          examen_id: examenId,
          est_disponible: true
        }));

      if (disponibilites.length > 0) {
        const { error: dispError } = await supabase
          .from('candidats_disponibilites')
          .insert(disponibilites);

        if (dispError) throw dispError;
      }

      return candidat;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Candidature enregistrée",
        description: "Vos informations ont été enregistrées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer vos informations.",
        variant: "destructive"
      });
    }
  });

  const handleDisponibiliteChange = (examenId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      disponibilites: {
        ...prev.disponibilites,
        [examenId]: checked
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.email || !formData.statut) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  if (!activeSession) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Aucune session de surveillance active pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Candidature enregistrée !</CardTitle>
            <CardDescription>
              Merci pour votre candidature. Vos informations ont été transmises au service des surveillances.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Gestion des Surveillances d'Examen</h1>
        <h2 className="text-xl text-muted-foreground">Secteur des Sciences de la Santé</h2>
        <p className="text-muted-foreground">
          Session {activeSession.name} - Candidature pour la surveillance d'examens
        </p>
      </div>

      {/* Liens vers les consignes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Documentation et Consignes</span>
          </CardTitle>
          <CardDescription>
            Consultez les documents suivants avant de remplir votre candidature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://www.uclouvain.be/fr/sss/consignes-de-surveillance" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Consignes de surveillance</span>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/faq-surveillants" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span>FAQ Surveillants</span>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/devenir-jobiste" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span>Devenir jobiste</span>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/auditoires-et-locaux" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              <span>Auditoires et locaux</span>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Informations personnelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statut">Statut *</Label>
              <Select value={formData.statut} onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assistant">Assistant</SelectItem>
                  <SelectItem value="Doctorant">Doctorant</SelectItem>
                  <SelectItem value="PAT">PAT</SelectItem>
                  <SelectItem value="PAT FASB">PAT FASB</SelectItem>
                  <SelectItem value="Jobiste">Jobiste</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.statut === 'Autre' && (
              <div className="space-y-2">
                <Label htmlFor="statut_autre">Précisez votre statut</Label>
                <Textarea
                  id="statut_autre"
                  value={formData.statut_autre}
                  onChange={(e) => setFormData(prev => ({ ...prev, statut_autre: e.target.value }))}
                  placeholder="Veuillez préciser votre statut..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disponibilités */}
        <Card>
          <CardHeader>
            <CardTitle>Disponibilités</CardTitle>
            <CardDescription>
              Cochez les créneaux d'examen où vous êtes disponible pour surveiller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examens?.map((examen) => (
                <div key={examen.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`examen-${examen.id}`}
                    checked={formData.disponibilites[examen.id] || false}
                    onCheckedChange={(checked) => handleDisponibiliteChange(examen.id, !!checked)}
                  />
                  <Label htmlFor={`examen-${examen.id}`} className="flex-1 cursor-pointer">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="font-medium">{examen.date_examen}</div>
                      <div className="text-sm text-muted-foreground">{examen.heure_debut} - {examen.heure_fin}</div>
                      <div>{examen.matiere}</div>
                      <Badge variant="outline">{examen.salle}</Badge>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            disabled={submitMutation.isPending}
            className="px-8"
          >
            {submitMutation.isPending ? "Envoi en cours..." : "Envoyer ma candidature"}
          </Button>
        </div>
      </form>
    </div>
  );
};
