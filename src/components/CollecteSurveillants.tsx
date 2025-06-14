import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BookOpen, ExternalLink, HelpCircle, Users, Building2, Home, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { format, parseISO, startOfWeek, endOfWeek, isSameWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { InformationsPersonnellesSection } from "./InformationsPersonnellesSection";
import { JobistePreferencesSection } from "./JobistePreferencesSection";
import { CommentaireSurveillanceSection } from "./CommentaireSurveillanceSection";

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

// Utility function signatures update - remove typeof uniqueCreneaux, use generics or explicit types.
/**
 * Grouper les créneaux par semaine (lundi-dimanche, puis on ignore samedi/dimanche à l'affichage)
 * @param creneaux array of unique slots (each slot object must have date_examen)
 */
function groupCreneauxByWeek(
  creneaux: {
    examenIds: string[];
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
  }[]
) {
  const semaines: {
    title: string;
    range: { start: Date; end: Date };
    creneaux: {
      examenIds: string[];
      date_examen: string;
      heure_debut: string;
      heure_fin: string;
    }[];
  }[] = [];

  creneaux.forEach((creneau) => {
    const dateObj = parseISO(creneau.date_examen);
    // semaine commence lundi
    const weekStart = startOfWeek(dateObj, { weekStartsOn: 1, locale: fr });
    const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1, locale: fr });

    // Section déjà existante ?
    let semaine = semaines.find((s) =>
      isSameWeek(dateObj, s.range.start, { weekStartsOn: 1 })
    );
    if (!semaine) {
      semaine = {
        title: `Semaine du ${format(weekStart, "dd-MM-yyyy", { locale: fr })} au ${format(weekEnd, "dd-MM-yyyy", { locale: fr })}`,
        range: { start: weekStart, end: weekEnd },
        creneaux: [],
      };
      semaines.push(semaine);
    }
    semaine.creneaux.push(creneau);
  });

  // Optionnel : on retire les créneaux samedi/dimanche de l'affichage
  semaines.forEach(sem => {
    sem.creneaux = sem.creneaux.filter(c => {
      const jour = parseISO(c.date_examen).getDay();
      return jour >= 1 && jour <= 5; // lundi-vendredi
    });
  });

  // Retirer les semaines "vides" éventuellement (tous créneaux samedi/dimanche)
  return semaines.filter(s => s.creneaux.length > 0);
}

export const CollecteSurveillants = () => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    statut: '',
    statut_autre: '',
    faculte: '',
    etp: null,
    quota_surveillance: null,
    disponibilites: {} as Record<string, boolean>,
    commentaires_surveillance: {} as Record<string, string>,
    noms_examens_obligatoires: {} as Record<string, string>,
    preferences_jobiste: {
      souhaite_maximum: false,
      plusieurs_par_jour: false,
      commentaires: ''
    }
  });

  const [submitted, setSubmitted] = useState(false);
  const [surveillantId, setSurveillantId] = useState<string|null>(null);

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

  // Ajouter un effet pour vérifier l'email
  useEffect(() => {
    // On vérifie l'email au blur pour ne pas requêter à chaque frappe
    if (!formData.email || !activeSession) return;
    let isCancelled = false;
    (async () => {
      // On recherche quelqu’un dans surveillants avec exact email
      const { data, error } = await supabase
        .from('surveillants')
        .select('id, nom, prenom')
        .eq('email', formData.email.trim())
        .maybeSingle();
      if (!isCancelled) {
        if (!data) {
          setSurveillantId(null);
        } else {
          setSurveillantId(data.id);
          if (formData.nom === '' && formData.prenom === '') {
            setFormData(f => ({ ...f, nom: data.nom, prenom: data.prenom }));
          }
        }
      }
    })();
    return () => { isCancelled = true; };
  }, [formData.email, activeSession]);

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

  // Rendu des créneaux uniques pour la sélection
  let uniqueCreneaux: {
    examenIds: string[];
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
  }[] = [];

  if (examens && examens.length > 0) {
    // Utilise un map pour éviter les doublons sur [date_examen, heure_debut, heure_fin]
    const creneauMap = new Map();
    for (const ex of examens) {
      const key = `${ex.date_examen}_${ex.heure_debut}_${ex.heure_fin}`;
      if (creneauMap.has(key)) {
        creneauMap.get(key).examenIds.push(ex.id);
      } else {
        creneauMap.set(key, {
          examenIds: [ex.id],
          date_examen: ex.date_examen,
          heure_debut: ex.heure_debut,
          heure_fin: ex.heure_fin,
        });
      }
    }
    uniqueCreneaux = Array.from(creneauMap.values());
  }

  const submitMutation = useMutation({
    mutationFn: async (dispoData: typeof formData) => {
      if (!surveillantId || !activeSession?.id) throw new Error("Vous n'êtes pas autorisé.");
      
      // Supprimer les disponibilités précédentes
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);
      
      // Préparer les nouvelles disponibilités avec commentaires
      const dispoList = Object.entries(dispoData.disponibilites)
        .filter(([_, ok]) => ok)
        .map(([examenId, _]) => {
          const slot = examens?.find(e => e.id === examenId);
          if (!slot) return null;
          return {
            surveillant_id: surveillantId,
            session_id: activeSession.id,
            date_examen: slot.date_examen,
            heure_debut: slot.heure_debut,
            heure_fin: slot.heure_fin,
            est_disponible: true,
            commentaire_surveillance_obligatoire: dispoData.commentaires_surveillance[examenId] || null,
            nom_examen_obligatoire: dispoData.noms_examens_obligatoires[examenId] || null
          };
        }).filter(Boolean);
      
      if (dispoList.length === 0) throw new Error("Veuillez sélectionner au moins un créneau.");
      
      // Insérer les disponibilités
      const { error } = await supabase
        .from('disponibilites')
        .insert(dispoList);
      if (error) throw error;

      // Enregistrer/mettre à jour les informations du candidat
      const candidatData = {
        nom: dispoData.nom,
        prenom: dispoData.prenom,
        email: dispoData.email,
        telephone: dispoData.telephone,
        statut: dispoData.statut,
        statut_autre: dispoData.statut_autre,
        faculte: dispoData.faculte,
        etp: dispoData.etp,
        quota_surveillance: dispoData.quota_surveillance,
        preferences_jobiste: dispoData.statut === 'Jobiste' ? dispoData.preferences_jobiste : null,
        session_id: activeSession.id
      };

      // Vérifier si le candidat existe déjà
      const { data: existingCandidat } = await supabase
        .from('candidats_surveillance')
        .select('id')
        .eq('email', dispoData.email)
        .eq('session_id', activeSession.id)
        .maybeSingle();

      if (existingCandidat) {
        await supabase
          .from('candidats_surveillance')
          .update(candidatData)
          .eq('id', existingCandidat.id);
      } else {
        await supabase
          .from('candidats_surveillance')
          .insert(candidatData);
      }

      return true;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Disponibilités enregistrées",
        description: "Merci ! Vos disponibilités ont été enregistrées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'enregistrement.",
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

  const handleCreneauChange = (creneauIds: string[], checked: boolean) => {
    setFormData((prev) => {
      const updated = { ...prev.disponibilites };
      creneauIds.forEach((id) => {
        updated[id] = checked;
      });
      return {
        ...prev,
        disponibilites: updated,
      };
    });
  };

  const handleCommentaireChange = (examenId: string, commentaire: string) => {
    setFormData(prev => ({
      ...prev,
      commentaires_surveillance: {
        ...prev.commentaires_surveillance,
        [examenId]: commentaire
      }
    }));
  };

  const handleNomExamenChange = (examenId: string, nomExamen: string) => {
    setFormData(prev => ({
      ...prev,
      noms_examens_obligatoires: {
        ...prev.noms_examens_obligatoires,
        [examenId]: nomExamen
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveillantId) {
      toast({
        title: "Non autorisé",
        description: "Votre email n'est pas reconnu. Contactez l'administrateur.",
        variant: "destructive"
      });
      return;
    }
    if (!formData.email || !formData.telephone) {
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

      {/* Notes explicatives */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-blue-800 font-medium">Important :</p>
              <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                <li>Si vous avez déjà une surveillance obligatoire pendant un créneau, cochez la case correspondante et renseignez le nom de l'examen.</li>
                <li>
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Maximisez le nombre de créneaux sélectionnés pour augmenter vos chances d'être retenu.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <InformationsPersonnellesSection
          formData={formData}
          setFormData={setFormData}
          activeSession={activeSession}
        />

        <JobistePreferencesSection
          statut={formData.statut}
          preferences={formData.preferences_jobiste}
          onPreferencesChange={(preferences) => 
            setFormData(prev => ({ ...prev, preferences_jobiste: preferences }))
          }
        />

        {/* Disponibilités avec commentaires */}
        <Card className="border-uclouvain-blue/20">
          <CardHeader>
            <CardTitle className="text-uclouvain-blue">Disponibilités</CardTitle>
            <CardDescription>
              Cochez les créneaux où vous êtes disponible pour surveiller. 
              Les horaires incluent le temps de préparation (45 minutes avant chaque examen).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {groupCreneauxByWeek(uniqueCreneaux).map((semaine, semIdx) => (
                <div key={semaine.title}>
                  <h3 className="font-bold text-uclouvain-blue mb-2">{semaine.title}</h3>
                  <div className="space-y-4">
                    {semaine.creneaux.map((creneau, idx) => {
                      const dateObj = parseISO(creneau.date_examen);
                      const jourSemaine = format(dateObj, "EEEE", { locale: fr });
                      const jourNum = format(dateObj, "dd-MM-yyyy", { locale: fr });
                      const { debutSurv, heure_fin } = formatExamSlotForDisplay(
                        creneau.date_examen,
                        creneau.heure_debut,
                        creneau.heure_fin
                      );
                      const anyChecked = creneau.examenIds.some(id => formData.disponibilites[id]);
                      
                      return (
                        <div
                          key={`${creneau.date_examen}_${creneau.heure_debut}_${creneau.heure_fin}`}
                          className="border border-uclouvain-blue/20 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`creneau-${semIdx}-${idx}`}
                              checked={anyChecked}
                              onCheckedChange={checked => handleCreneauChange(creneau.examenIds, !!checked)}
                            />
                            <Label htmlFor={`creneau-${semIdx}-${idx}`} className="flex-1 cursor-pointer">
                              <div className="font-medium text-uclouvain-blue flex items-center space-x-2">
                                <span className="capitalize">{jourSemaine}</span>
                                <span>{jourNum}</span>
                                <span className="text-sm text-muted-foreground">
                                  {debutSurv} - {heure_fin}
                                </span>
                              </div>
                            </Label>
                          </div>
                          
                          {anyChecked && creneau.examenIds.map(examenId => (
                            <CommentaireSurveillanceSection
                              key={examenId}
                              creneauId={examenId}
                              commentaire={formData.commentaires_surveillance[examenId] || ""}
                              nomExamen={formData.noms_examens_obligatoires[examenId] || ""}
                              onCommentaireChange={handleCommentaireChange}
                              onNomExamenChange={handleNomExamenChange}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            disabled={submitMutation.isPending || !surveillantId}
            className="px-8 bg-uclouvain-blue hover:bg-uclouvain-blue/90 text-white"
          >
            {submitMutation.isPending ? "Envoi en cours..." : "Enregistrer mes disponibilités"}
          </Button>
        </div>
      </form>
    </div>
  );
};
