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
import { SurveillantProfilePanel } from "./SurveillantProfilePanel";
import { UnknownSurveillantForm } from "./UnknownSurveillantForm";
import { CreneauRow } from "./CreneauRow";
import { Input } from "@/components/ui/input";

interface ExamenSlot {
  id: string;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  salle: string;
}

export const CollecteSurveillants = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [surveillantId, setSurveillantId] = useState<string|null>(null);
  const [surveillantData, setSurveillantData] = useState<any>(null);
  const [disposEnregistrees, setDisposEnregistrees] = useState(false);

  // Données pour profil inconnu
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');

  // Surveillances à déduire
  const [surveillancesADeduire, setSurveillancesADeduire] = useState(0);

  // Disponibilités avec nouveau système
  const [newDispos, setNewDispos] = useState<Record<string, { dispo: boolean, type_choix: string, nom_examen_selectionne: string }>>({});

  // Récupérer la session active
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

  // Vérifier l'email et charger le profil surveillant
  useEffect(() => {
    if (!email || !activeSession) return;
    let isCancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('surveillants')
        .select('id, nom, prenom, type, surveillances_a_deduire')
        .eq('email', email.trim())
        .maybeSingle();
      if (!isCancelled) {
        if (!data) {
          setSurveillantId(null);
          setSurveillantData(null);
          setSurveillancesADeduire(0);
        } else {
          setSurveillantId(data.id);
          setSurveillantData(data);
          setSurveillancesADeduire(data.surveillances_a_deduire || 0);
          setNom(data.nom);
          setPrenom(data.prenom);
        }
      }
    })();
    return () => { isCancelled = true; };
  }, [email, activeSession]);

  // Récupérer les examens pour créer les créneaux
  const { data: examens } = useQuery({
    queryKey: ['examens-public', activeSession?.id],
    queryFn: async (): Promise<ExamenSlot[]> => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere, salle')
        .eq('session_id', activeSession.id)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen')
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });

  // Créer les créneaux uniques
  let uniqueCreneaux: {
    examenIds: string[];
    date_examen: string;
    heure_debut: string;
    heure_fin: string;
  }[] = [];

  if (examens && examens.length > 0) {
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

  // Charger les disponibilités existantes
  useEffect(() => {
    if (!surveillantId || !activeSession?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('disponibilites')
        .select('date_examen, heure_debut, heure_fin, type_choix, nom_examen_selectionne')
        .eq('surveillant_id', surveillantId)
        .eq('session_id', activeSession.id);
      if (!error && data && data.length > 0) {
        setDisposEnregistrees(true);
        const loadedDispos: Record<string, { dispo: boolean, type_choix: string, nom_examen_selectionne: string }> = {};
        data.forEach((row: any) => {
          const key = `${row.date_examen}|${row.heure_debut}|${row.heure_fin}`;
          loadedDispos[key] = {
            dispo: true,
            type_choix: row.type_choix || 'souhaitee',
            nom_examen_selectionne: row.nom_examen_selectionne || ''
          };
        });
        setNewDispos(loadedDispos);
      }
    })();
  }, [surveillantId, activeSession?.id]);

  // Handlers pour les disponibilités
  const handleDisponibleChange = (key: string, checked: boolean) => {
    setNewDispos(d => ({
      ...d,
      [key]: { ...d[key], dispo: checked, type_choix: d[key]?.type_choix || 'souhaitee', nom_examen_selectionne: d[key]?.nom_examen_selectionne || '' }
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

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !telephone) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir l'email et le téléphone.",
        variant: "destructive"
      });
      return;
    }

    // Pour surveillant inconnu, créer le profil
    let usedSurveillantId = surveillantId;
    if (!surveillantId) {
      if (!nom || !prenom) {
        toast({
          title: "Champs requis",
          description: "Veuillez remplir le nom et prénom.",
          variant: "destructive"
        });
        return;
      }
      
      const { data: surveillantObj } = await supabase
        .from('surveillants')
        .insert({
          email: email,
          nom,
          prenom,
          telephone: telephone,
          statut: 'candidat',
          type: 'Candidat'
        })
        .select('id')
        .single();
      usedSurveillantId = surveillantObj?.id;
    } else {
      // Mettre à jour les surveillances à déduire
      await supabase
        .from('surveillants')
        .update({ 
          surveillances_a_deduire: surveillancesADeduire,
          telephone: telephone 
        })
        .eq('id', surveillantId);
    }

    // Préparer les disponibilités
    const listDispos = Object.entries(newDispos)
      .filter(([_, d]) => d.dispo)
      .map(([key, d]) => {
        const [date_examen, heure_debut, heure_fin] = key.split("|");
        return {
          surveillant_id: usedSurveillantId,
          session_id: activeSession?.id,
          date_examen,
          heure_debut,
          heure_fin,
          est_disponible: true,
          type_choix: d.type_choix,
          nom_examen_selectionne: d.nom_examen_selectionne
        };
      });

    if (listDispos.length === 0) {
      toast({
        title: "Aucune disponibilité",
        description: "Veuillez sélectionner au moins un créneau.",
        variant: "destructive"
      });
      return;
    }

    // Supprimer les anciennes disponibilités
    if (usedSurveillantId) {
      await supabase
        .from('disponibilites')
        .delete()
        .eq('surveillant_id', usedSurveillantId)
        .eq('session_id', activeSession?.id);
    }

    // Insérer les nouvelles disponibilités
    await supabase.from('disponibilites').insert(listDispos);

    toast({
      title: "Sauvegardé",
      description: "Vos disponibilités ont été enregistrées avec succès.",
    });
    setSubmitted(true);
    setDisposEnregistrees(true);
  };

  // Ajout état pour check présence et gestion personnes amenées
  const [isPresentSelf, setIsPresentSelf] = useState(true); // Présence par défaut = true 
  const [nbAmenes, setNbAmenes] = useState(0);
  const [personnesAmenes, setPersonnesAmenes] = useState([]);

  // Affichage conditionnel
  if (!email) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Collecte des disponibilités de surveillance</CardTitle>
            <CardDescription>
              Veuillez saisir votre adresse email pour commencer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Votre email *</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="prenom.nom@uclouvain.be"
                  required
                />
              </div>
              <Button 
                onClick={() => email && setEmail(email)}
                disabled={!email}
                className="w-full"
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted || disposEnregistrees) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CollecteHeader title="Gestion des Surveillances d'Examen" />
        <Card className="border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-green-800">Disponibilités enregistrées !</CardTitle>
            <CardDescription>
              Merci pour votre candidature. Vos disponibilités ont été transmises au service des surveillances.
            </CardDescription>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="border-blue-600 text-blue-600"
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

  // Affichage principal du formulaire
  let profilePanel = null;
  if (surveillantData) {
    profilePanel = (
      <SurveillantProfilePanel
        surveillant={{ ...surveillantData, email }}
        telephone={telephone}
        setTelephone={setTelephone}
        surveillancesADeduire={surveillancesADeduire}
        setSurveillancesADeduire={setSurveillancesADeduire}
        onDemandeModif={() => {}}
      />
    );
  } else {
    profilePanel = (
      <UnknownSurveillantForm
        nom={nom}
        setNom={setNom}
        prenom={prenom}
        setPrenom={setPrenom}
        telephone={telephone}
        setTelephone={setTelephone}
      />
    );
  }

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CollecteHeader title="Collecte des disponibilités de surveillance" />
      
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Email : {email}</CardTitle>
          </CardHeader>
          <CardContent>
            {profilePanel}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Créneaux de surveillance disponibles</span>
            </CardTitle>
            <CardDescription>
              Sélectionnez les créneaux où vous êtes disponible. Vous pouvez préciser si c'est une surveillance obligatoire ou souhaitée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creneauRows.length > 0 ? creneauRows : (
                <p className="text-center text-gray-500 py-8">
                  Aucun créneau de surveillance disponible pour cette session.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            {/* Présence à la surveillance : */}
            <div className="flex flex-col">
              <div className="font-bold text-lg flex items-center">
                <span>Votre présence à la surveillance</span>
              </div>
              <div className="mt-2 bg-blue-50 rounded px-3 py-2 flex items-center gap-2">
                Surveillants théoriques nécessaires :
                <span className="text-blue-700 font-bold">{Math.max(0, nombreSurveillantsTotaux - (isPresentSelf ? 1 : 0) - nbAmenes)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isPresentSelf}
                onCheckedChange={checked => setIsPresentSelf(!!checked)}
                className="scale-125"
              />
              <span className="font-medium">Je serai présent pour assurer la surveillance</span>
            </div>
            <div className="text-xs text-gray-600">
              Par défaut, nous considérons que vous serez présent. Décochez si vous ne pouvez pas assurer la surveillance.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold text-lg">
              Personnes que vous amenez
            </div>
            <div className="mt-2 bg-orange-50 rounded px-3 py-2 text-orange-800 font-semibold">
              Surveillants restants à attribuer : {Math.max(0, nombreSurveillantsTotaux - (isPresentSelf ? 1 : 0) - nbAmenes)}
            </div>
          </CardHeader>
          <CardContent>
            <label className="block mb-1 font-medium">
              Nombre de personnes que j’amenez
            </label>
            <Input
              type="number"
              min={0}
              max={10}
              value={nbAmenes}
              onChange={e => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setNbAmenes(val);
                setPersonnesAmenes(arr => {
                  const copies = arr.slice(0, val);
                  while (copies.length < val) copies.push({ nom: "", prenom: "" });
                  return copies;
                });
              }}
              className="max-w-[100px]"
            />
            <div className="text-xs text-gray-700 mb-2">
              Indiquez le nombre de personnes (assistants, collègues) que vous amenez pour aider à la surveillance.
            </div>
            {/* Affiche dynamiquement les champs pour noms/prénoms */}
            <AmenesSurveillantsFields nombre={nbAmenes} personnes={personnesAmenes} setPersonnes={setPersonnesAmenes} />
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button type="submit" size="lg" className="px-8">
            Enregistrer mes disponibilités
          </Button>
        </div>
      </form>
    </div>
  );
};
