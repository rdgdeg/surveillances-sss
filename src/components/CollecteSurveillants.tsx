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
import { CollecteHeader } from "./CollecteHeader";
import { CollecteExplications } from "./CollecteExplications";
import { CollecteDocumentation } from "./CollecteDocumentation";
import { DisponibilitesSection } from "./DisponibilitesSection";

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
        <CollecteHeader title="Gestion des Surveillances d'Examen" />
        <div className="mt-6">
          <Card className="border-uclouvain-blue/20">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucune session de surveillance active pour le moment.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CollecteHeader title="Gestion des Surveillances d'Examen" />
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
      <CollecteHeader
        title="Gestion des Surveillances d'Examen"
        subtitle="Secteur des Sciences de la Santé"
        sessionName={activeSession.name}
      />

      <CollecteExplications />

      <CollecteDocumentation />

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

        <DisponibilitesSection
          uniqueCreneaux={uniqueCreneaux}
          formData={formData}
          handleCreneauChange={handleCreneauChange}
          handleCommentaireChange={handleCommentaireChange}
          handleNomExamenChange={handleNomExamenChange}
        />

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
