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

import { SurveillantProfilePanel } from "./SurveillantProfilePanel";
import { UnknownSurveillantForm } from "./UnknownSurveillantForm";
import { CreneauRow } from "./CreneauRow";

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
  const [disposEnregistrees, setDisposEnregistrees] = useState(false); // <--- voir si dispo déjà envoyées
  const [disposInitiales, setDisposInitiales] = useState<any>(null);   // pour restauration en modification

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

  // Ajout des nouveaux états pour surveillances à déduire
  const [surveillancesADeduire, setSurveillancesADeduire] = useState(0);

  // Pour le formulaire inconnu
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');

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

  // Lorsqu'on charge le profil surveillant, on récupère aussi surveillances_a_deduire si existant
  useEffect(() => {
    if (!formData.email || !activeSession) return;
    let isCancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .select('id, nom, prenom, surveillances_a_deduire')
        .eq('email', formData.email.trim())
        .maybeSingle();
      if (!isCancelled) {
        if (!data) {
          setSurveillantId(null);
          setSurveillancesADeduire(0);
        } else {
          setSurveillantId(data.id);
          setSurveillancesADeduire(data.surveillances_a_deduire || 0);
          if (formData.nom === '' && formData.prenom === '') {
            setFormData(f => ({ ...f, nom: data.nom, prenom: data.prenom }));
          }
        }
      }
    })();
    return () => { isCancelled = true; };
  }, [formData.email, activeSession]);

  // Affichage principal du formulaire : email requis pour tout le monde
  if (!formData.email) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white p-6 rounded shadow">
          <label className="block text-sm font-semibold mb-2">Votre email *</label>
          <Input
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            type="email"
            placeholder="prenom.nom@uclouvain.be"
            required
          />
        </div>
      </div>
    );
  }

  // Affichage panel surveillant reconnu ou inconnu
  let profilePanel = null;
  if (surveillantId) {
    profilePanel = (
      <SurveillantProfilePanel
        surveillant={{ ...formData, id: surveillantId }}
        telephone={formData.telephone}
        setTelephone={v => setFormData(f => ({ ...f, telephone: v }))}
        surveillancesADeduire={surveillancesADeduire}
        setSurveillancesADeduire={setSurveillancesADeduire}
      />
    );
  } else {
    profilePanel = (
      <UnknownSurveillantForm
        nom={nom}
        setNom={setNom}
        prenom={prenom}
        setPrenom={setPrenom}
        telephone={formData.telephone}
        setTelephone={v => setFormData(f => ({ ...f, telephone: v }))}
      />
    );
  }

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

  // Pré-remplir les données précédentes si elles existent (en mode modification)
  useEffect(() => {
    if (!surveillantId || !activeSession?.id) return;
    (async () => {
      // On cherche s'il existe déjà des disponibilités pour cet utilisateur/session
      const { data, error } = await supabase
        .from('disponibilites')
        .select('examen_id, commentaire_surveillance_obligatoire, nom_examen_obligatoire')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);
      if (!error && data && data.length > 0) {
        // On marque qu'il y avait des dispos...
        setDisposEnregistrees(true);
        // On génère un objet pour cochage et commentaires
        const newDispos: Record<string, boolean> = {};
        const newCommentaires: Record<string, string> = {};
        const newNomsExamens: Record<string, string> = {};
        data.forEach((row: any) => {
          newDispos[row.examen_id] = true;
          if (row.commentaire_surveillance_obligatoire)
            newCommentaires[row.examen_id] = row.commentaire_surveillance_obligatoire;
          if (row.nom_examen_obligatoire)
            newNomsExamens[row.examen_id] = row.nom_examen_obligatoire;
        });
        setFormData(prev => ({
          ...prev,
          disponibilites: newDispos,
          commentaires_surveillance: newCommentaires,
          noms_examens_obligatoires: newNomsExamens
        }));
        // Stockage des données initiales pour restauration éventuelle
        setDisposInitiales({
          disponibilites: newDispos,
          commentaires_surveillance: newCommentaires,
          noms_examens_obligatoires: newNomsExamens
        });
      }
    })();
  // eslint-disable-next-line
  }, [surveillantId, activeSession?.id]); // (on surveille surveillantId seulement au premier rendu)

  // Pour chaque créneau, options de dispo : dispo, type_choix, nom_examen_selectionne
  const [newDispos, setNewDispos] = useState<Record<string, { dispo: boolean, type_choix: string, nom_examen_selectionne: string }>>({});

  // Gestion des changements pour chaque créneau
  const handleDisponibleChange = (key: string, checked: boolean) => {
    setNewDispos(d => ({
      ...d,
      [key]: { ...d[key], dispo: checked, type_choix: d[key]?.type_choix || 'souhaitee' }
    }));
  };
  const handleTypeChange = (key: string, type: string) => {
    setNewDispos(d => ({
      ...d,
      [key]: { ...d[key], type_choix: type }
    }));
  };
  const handleNomExamenChange = (key: string, val: string) => {
    setNewDispos(d => ({
      ...d,
      [key]: { ...d[key], nom_examen_selectionne: val }
    }));
  };

  // Affichage des créneaux sous forme simplifiée
  const creneauRows = (uniqueCreneaux || []).map(creneau => {
    const key = `${creneau.date_examen}|${creneau.heure_debut}|${creneau.heure_fin}`;
    const value = newDispos[key] || { dispo: false, type_choix: 'souhaitee', nom_examen_selectionne: "" };
    return (
      <CreneauRow
        key={key}
        creneauKey={key}
        creneau={creneau}
        value={value}
        onDisponibleChange={handleDisponibleChange}
        onTypeChange={handleTypeChange}
        onNomExamenChange={handleNomExamenChange}
      />
    );
  });

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
      let dispoList = Object.entries(newDispos)
        .filter(([_, d]) => d.dispo)
        .map(([key, d]) => {
          const [date_examen, heure_debut, heure_fin] = key.split("|");
          return {
            surveillant_id: surveillantId ?? null,
            session_id: activeSession?.id ?? null,
            date_examen,
            heure_debut,
            heure_fin,
            est_disponible: true,
            type_choix: d.type_choix,
            nom_examen_selectionne: d.nom_examen_selectionne
          };
        });

      // Déduplication renforcée : garder UNE entrée par (date_examen, heure_debut, heure_fin)
      const uniqueDispoList: any[] = [];
      const keys = new Set();
      for (const d of dispoList) {
        const key = d && `${d.surveillant_id}_${d.session_id}_${d.date_examen}_${d.heure_debut}_${d.heure_fin}`;
        if (!keys.has(key)) {
          keys.add(key);
          uniqueDispoList.push(d);
        }
      }

      if (uniqueDispoList.length === 0) throw new Error("Veuillez sélectionner au moins un créneau.");

      // Insérer les disponibilités dédupliquées
      const { error } = await supabase
        .from('disponibilites')
        .insert(uniqueDispoList);
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
      setDisposEnregistrees(true);
      // Sauvegarde les données de dispos pour une future modification
      setDisposInitiales({
        disponibilites: formData.disponibilites,
        commentaires_surveillance: formData.commentaires_surveillance,
        noms_examens_obligatoires: formData.noms_examens_obligatoires
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.telephone) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    // Pour surveillant connu : on MAJ le champ surveillances à déduire
    if (surveillantId) {
      await supabase
        .from('surveillants')
        .update({ surveillances_a_deduire: surveillancesADeduire })
        .eq('id', surveillantId);
    }

    // Préparer les enregistrements dans disponibilites
    const listDispos = Object.entries(newDispos)
      .filter(([_, d]) => d.dispo)
      .map(([key, d]) => {
        const [date_examen, heure_debut, heure_fin] = key.split("|");
        return {
          surveillant_id: surveillantId ?? null,
          session_id: activeSession?.id ?? null,
          date_examen,
          heure_debut,
          heure_fin,
          est_disponible: true,
          type_choix: d.type_choix,
          nom_examen_selectionne: d.nom_examen_selectionne
        };
      });

    // Pour profil inconnu, créer une candidature et surveillant si pas déjà fait
    let usedSurveillantId = surveillantId;
    if (!surveillantId) {
      const { data: surveillantObj } = await supabase
        .from('surveillants')
        .insert({
          email: formData.email,
          nom,
          prenom,
          telephone: formData.telephone,
          statut: 'candidat',
          type: 'Candidat'
        })
        .select('id')
        .single();
      usedSurveillantId = surveillantObj?.id;
      await supabase.from('candidats_surveillance').insert({
        nom,
        prenom,
        email: formData.email,
        telephone: formData.telephone,
        statut: 'candidat_spontané'
      });
    }
    // Supprimer les anciennes dispos de l'utilisateur/email
    if (usedSurveillantId) {
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', usedSurveillantId)
        .eq('session_id', activeSession?.id);
    }
    // Insérer les nouvelles dispos (pour tout le monde)
    if (listDispos.length > 0) {
      await supabase.from('disponibilites').insert(
        listDispos.map(d => ({
          ...d,
          surveillant_id: usedSurveillantId ?? null,
          session_id: activeSession?.id ?? null
        }))
      );
    }

    toast({
      title: "Sauvegardé",
      description: "Vos disponibilités ont été enregistrées avec succès.",
    });
    // Afficher confirmation, reset ou navigation
  };

  // Si les dispos sont envoyées (confirmation), afficher recap + bouton modifier
  if (submitted || disposEnregistrees) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CollecteHeader title="Gestion des Surveillances d'Examen" />
        <Card className="border-uclouvain-cyan">
          <CardHeader className="text-center">
            <CardTitle className="text-uclouvain-blue">Disponibilités enregistrées !</CardTitle>
            <CardDescription>
              Merci pour votre candidature. Vos disponibilités ont été transmises au service des surveillances.
            </CardDescription>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="border-uclouvain-blue text-uclouvain-blue"
                onClick={() => setSubmitted(false)}
              >
                Modifier mes disponibilités
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <form className="max-w-2xl mx-auto space-y-4" onSubmit={handleSubmit}>
      {profilePanel}
      <div className="bg-white p-4 rounded space-y-4">
        <h4 className="font-semibold mb-2">Créneaux de surveillance disponibles</h4>
        {creneauRows}
      </div>
      <Button type="submit" className="w-full mt-4">
        Enregistrer mes disponibilités
      </Button>
    </form>
  );
};
