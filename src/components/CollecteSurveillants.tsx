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
import { UserPlus, ExternalLink, BookOpen, HelpCircle, Users, Building2, Home } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ExamenSlot {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
}

// ⚡ Ajout fonction utilitaire pour formater la date et calculer l'heure début surveillance
function formatExamSlotForDisplay(date_examen: string, heure_debut: string, heure_fin: string) {
  // format date: jour-mois-année
  const date = new Date(`${date_examen}T${heure_debut}`);
  const jour = String(date.getDate()).padStart(2, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const annee = date.getFullYear();
  const formattedDate = `${jour}-${mois}-${annee}`;

  // calcul heure début surveillance (45 min avant heure_debut)
  const [hdHour, hdMin] = heure_debut.split(":").map(Number);
  const debutSurv = new Date(date);
  debutSurv.setHours(hdHour);
  debutSurv.setMinutes(hdMin - 45);
  // Gère le cas où on soustrait 45min à, par exemple "08:30"
  if (debutSurv.getMinutes() < 0) {
    debutSurv.setHours(debutSurv.getHours() - 1);
    debutSurv.setMinutes(debutSurv.getMinutes() + 60);
  }
  const dh = String(debutSurv.getHours()).padStart(2, "0");
  const dm = String(debutSurv.getMinutes()).padStart(2, "0");
  const startSurv = `${dh}:${dm}`;

  // heure fin inchangée (affichée à droite)
  return {
    formattedDate,
    debutSurv: startSurv,
    heure_fin
  };
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
        title: "Disponibilités enregistrées",
        description: "Vos disponibilités ont été enregistrées avec succès.",
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
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" asChild className="border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
        <Card className="border-uclouvain-blue/20">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
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
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" asChild className="border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
        <Card className="border-uclouvain-cyan">
          <CardHeader className="text-center">
            <CardTitle className="text-uclouvain-blue">Disponibilités enregistrées !</CardTitle>
            <CardDescription>
              Merci pour votre candidature. Vos disponibilités ont été transmises au service des surveillances.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Navigation Button */}
      <div className="flex justify-between items-center">
        <Button variant="outline" asChild className="border-uclouvain-blue text-uclouvain-blue hover:bg-uclouvain-blue hover:text-white">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>

      {/* Header avec logo UCLouvain */}
      <div className="text-center space-y-4 py-8 bg-gradient-uclouvain rounded-lg text-white">
        <div className="flex justify-center mb-4">
          <img 
            src="/lovable-uploads/5ff3f8eb-c734-4f43-bde5-5d591faf4b9a.png" 
            alt="UCLouvain" 
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-3xl font-bold">Gestion des Surveillances d'Examen</h1>
        <h2 className="text-xl text-uclouvain-cyan">Secteur des Sciences de la Santé</h2>
        <p className="text-white/90">
          Session {activeSession.name} - Candidature pour la surveillance d'examens
        </p>
      </div>

      {/* Liens vers les consignes */}
      <Card className="border-uclouvain-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-uclouvain-blue">
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
              className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
            >
              <BookOpen className="h-4 w-4 text-uclouvain-blue" />
              <span className="text-uclouvain-blue">Consignes de surveillance</span>
              <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/faq-surveillants" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-uclouvain-blue" />
              <span className="text-uclouvain-blue">FAQ Surveillants</span>
              <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/devenir-jobiste" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
            >
              <Users className="h-4 w-4 text-uclouvain-blue" />
              <span className="text-uclouvain-blue">Devenir jobiste</span>
              <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
            </a>
            <a 
              href="https://www.uclouvain.be/fr/sss/auditoires-et-locaux" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/10 hover:border-uclouvain-cyan transition-colors"
            >
              <Building2 className="h-4 w-4 text-uclouvain-blue" />
              <span className="text-uclouvain-blue">Auditoires et locaux</span>
              <ExternalLink className="h-4 w-4 ml-auto text-uclouvain-cyan" />
            </a>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <Card className="border-uclouvain-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-uclouvain-blue">
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
        <Card className="border-uclouvain-blue/20">
          <CardHeader>
            <CardTitle className="text-uclouvain-blue">Disponibilités</CardTitle>
            <CardDescription>
              Cochez les créneaux d'examen où vous êtes disponible pour surveiller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examens?.map((examen) => {
                const { formattedDate, debutSurv, heure_fin } = formatExamSlotForDisplay(
                  examen.date_examen,
                  examen.heure_debut,
                  examen.heure_fin
                );
                return (
                  <div key={examen.id} className="flex items-center space-x-3 p-3 border border-uclouvain-blue/20 rounded-lg hover:bg-uclouvain-cyan/5 transition-colors">
                    <Checkbox
                      id={`examen-${examen.id}`}
                      checked={formData.disponibilites[examen.id] || false}
                      onCheckedChange={(checked) => handleDisponibiliteChange(examen.id, !!checked)}
                    />
                    <Label htmlFor={`examen-${examen.id}`} className="flex-1 cursor-pointer">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="font-medium text-uclouvain-blue flex items-center space-x-2">
                          <span>{formattedDate}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {debutSurv} - {heure_fin}
                        </div>
                        <div className="text-uclouvain-blue">{examen.matiere}</div>
                        <Badge variant="outline" className="border-uclouvain-cyan text-uclouvain-cyan">{examen.salle}</Badge>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            disabled={submitMutation.isPending}
            className="px-8 bg-uclouvain-blue hover:bg-uclouvain-blue/90 text-white"
          >
            {submitMutation.isPending ? "Envoi en cours..." : "Envoyer mes disponibilités"}
          </Button>
        </div>
      </form>
    </div>
  );
};
