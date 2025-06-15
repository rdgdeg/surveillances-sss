
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DemandeModificationModal } from "./DemandeModificationModal";
import { User, Calendar, CheckSquare, Phone, AlertCircle, RefreshCw } from "lucide-react";

interface Surveillant {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  type: string;
  telephone: string | null;
  quota: number;
  session_id: string;
}

interface CreneauSimple {
  id: string;
  date_surveillance: string;
  heure_debut_surveillance: string;
  heure_fin_surveillance: string;
  matiere: string;
  nombre_examens: number;
}

export function SimpleSurveillantAvailabilityForm() {
  const [etape, setEtape] = useState<'email' | 'profil' | 'disponibilites' | 'termine'>('email');
  const [email, setEmail] = useState("");
  const [surveillant, setSurveillant] = useState<Surveillant | null>(null);
  const [telephone, setTelephone] = useState("");
  const [creneaux, setCreneaux] = useState<CreneauSimple[]>([]);
  const [disponibilites, setDisponibilites] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger le profil surveillant
  const chargerProfil = async () => {
    if (!email.includes("@")) return;
    
    setLoading(true);
    try {
      const { data: surveillantData, error } = await supabase
        .from("surveillants")
        .select("id,email,nom,prenom,type,telephone")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (surveillantData) {
        // Récupérer le quota et session active
        const { data: sessionData } = await supabase
          .from("surveillant_sessions")
          .select(`
            quota,
            session_id,
            sessions!inner(id, is_active)
          `)
          .eq("surveillant_id", surveillantData.id)
          .eq("is_active", true)
          .eq("sessions.is_active", true)
          .maybeSingle();

        if (!sessionData) {
          toast({
            title: "Aucune session active",
            description: "Vous n'êtes associé à aucune session d'examens active pour le moment.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        setSurveillant({
          ...surveillantData,
          quota: sessionData?.quota ?? 0,
          session_id: sessionData?.session_id ?? ""
        });
        setTelephone(surveillantData.telephone || "");
        setEtape('profil');
      } else {
        toast({
          title: "Email non trouvé",
          description: "Cet email n'est pas reconnu dans notre système de surveillance.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger les créneaux de surveillance
  useEffect(() => {
    if (surveillant?.session_id) {
      chargerCreneaux();
    }
  }, [surveillant?.session_id]);

  const chargerCreneaux = async () => {
    if (!surveillant?.session_id) return;

    console.log('Loading surveillance slots for session:', surveillant.session_id);

    try {
      // Debug: Check what exams exist in the session
      const { data: allExams } = await supabase
        .from('examens')
        .select('id, code_examen, statut_validation, is_active, date_examen, heure_debut, heure_fin, matiere')
        .eq('session_id', surveillant.session_id);

      console.log('All exams in session:', allExams?.length || 0, allExams);

      // Récupérer les examens validés et actifs pour cette session
      const { data: examensData, error: examensError } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere')
        .eq('session_id', surveillant.session_id)
        .eq('statut_validation', 'VALIDE')
        .eq('is_active', true)
        .order('date_examen')
        .order('heure_debut');

      if (examensError) {
        console.error('Error loading exams:', examensError);
        throw examensError;
      }

      console.log('Found validated exams:', examensData?.length || 0, examensData);

      if (!examensData?.length) {
        // Check if there are surveillance slots in the database
        const { data: existingSlots } = await supabase
          .from('creneaux_surveillance')
          .select('*')
          .order('date_surveillance');

        console.log('Existing surveillance slots in DB:', existingSlots?.length || 0);

        setCreneaux([]);
        toast({
          title: "Aucun créneau disponible",
          description: "Aucun examen validé n'a été trouvé pour cette session. Vérifiez que les examens ont été validés par l'administration.",
          variant: "destructive"
        });
        return;
      }

      // Générer les créneaux de surveillance (45 min avant jusqu'à la fin de l'examen)
      const creneauxGroupes = new Map();
      examensData.forEach(examen => {
        // Calculer l'heure de début de surveillance (45 min avant)
        const [heureDebut, minuteDebut] = examen.heure_debut.split(':').map(Number);
        const debutSurveillance = new Date();
        debutSurveillance.setHours(heureDebut, minuteDebut - 45, 0, 0);
        
        const heureDebutSurveillance = debutSurveillance.toTimeString().slice(0, 5);
        
        const key = `${examen.date_examen}_${heureDebutSurveillance}_${examen.heure_fin}`;
        
        if (!creneauxGroupes.has(key)) {
          creneauxGroupes.set(key, {
            id: examen.id,
            date_surveillance: examen.date_examen,
            heure_debut_surveillance: heureDebutSurveillance,
            heure_fin_surveillance: examen.heure_fin,
            matiere: examen.matiere || 'Matière inconnue',
            nombre_examens: 1
          });
        } else {
          creneauxGroupes.get(key).nombre_examens++;
        }
      });

      const creneauxArray = Array.from(creneauxGroupes.values());
      console.log('Generated surveillance slots:', creneauxArray.length, creneauxArray);
      setCreneaux(creneauxArray);

      // Charger les disponibilités existantes
      const { data: dispoData } = await supabase
        .from('disponibilites')
        .select('date_examen, heure_debut, heure_fin')
        .eq('surveillant_id', surveillant.id)
        .eq('session_id', surveillant.session_id)
        .eq('est_disponible', true);

      const dispoObj: Record<string, boolean> = {};
      (dispoData || []).forEach(d => {
        const key = `${d.date_examen}_${d.heure_debut}_${d.heure_fin}`;
        dispoObj[key] = true;
      });
      setDisponibilites(dispoObj);

    } catch (error: any) {
      console.error('Error loading surveillance slots:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux de surveillance.",
        variant: "destructive"
      });
    }
  };

  const sauvegarderDisponibilites = async () => {
    if (!surveillant) return;

    // Correction de la regex pour valider le téléphone
    if (!telephone.match(/^[+]?[\d\s-()]+$/)) {
      toast({
        title: "Téléphone requis",
        description: "Veuillez saisir un numéro de téléphone valide.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Mettre à jour le téléphone
      await supabase
        .from("surveillants")
        .update({ telephone })
        .eq("id", surveillant.id);

      // Supprimer les disponibilités existantes
      await supabase
        .from("disponibilites")
        .delete()
        .eq("surveillant_id", surveillant.id)
        .eq("session_id", surveillant.session_id);

      // Insérer les nouvelles disponibilités
      const nouvellesDispos = creneaux
        .filter(creneau => {
          const key = `${creneau.date_surveillance}_${creneau.heure_debut_surveillance}_${creneau.heure_fin_surveillance}`;
          return disponibilites[key];
        })
        .map(creneau => ({
          surveillant_id: surveillant.id,
          session_id: surveillant.session_id,
          date_examen: creneau.date_surveillance,
          heure_debut: creneau.heure_debut_surveillance,
          heure_fin: creneau.heure_fin_surveillance,
          est_disponible: true
        }));

      if (nouvellesDispos.length > 0) {
        const { error } = await supabase
          .from("disponibilites")
          .insert(nouvellesDispos);

        if (error) throw error;
      }

      toast({
        title: "Sauvegardé",
        description: "Vos disponibilités ont été enregistrées avec succès.",
      });
      setEtape('termine');

    } catch (error: any) {
      console.error('Error saving availabilities:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const grouperParSemaine = () => {
    const semaines: Record<string, CreneauSimple[]> = {};
    creneaux.forEach(creneau => {
      const date = new Date(creneau.date_surveillance);
      const lundi = new Date(date);
      lundi.setDate(date.getDate() - date.getDay() + 1);
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);
      
      const semaineKey = `Semaine du ${lundi.getDate()}/${lundi.getMonth() + 1} au ${dimanche.getDate()}/${dimanche.getMonth() + 1}`;
      
      if (!semaines[semaineKey]) semaines[semaineKey] = [];
      semaines[semaineKey].push(creneau);
    });
    return semaines;
  };

  // Debug function
  const debugData = async () => {
    if (!surveillant?.session_id) return;
    
    console.log('=== DEBUG DATA ===');
    
    const { data: allExams } = await supabase
      .from('examens')
      .select('*')
      .eq('session_id', surveillant.session_id);
    console.log('All exams:', allExams);
    
    const { data: validatedExams } = await supabase
      .from('examens')
      .select('*')
      .eq('session_id', surveillant.session_id)
      .eq('statut_validation', 'VALIDE');
    console.log('Validated exams:', validatedExams);
    
    const { data: slots } = await supabase
      .from('creneaux_surveillance')
      .select('*');
    console.log('Surveillance slots:', slots);
    
    toast({
      title: "Debug",
      description: `Examens: ${allExams?.length || 0}, Validés: ${validatedExams?.length || 0}, Créneaux: ${slots?.length || 0}`,
    });
  };

  // Étape 1: Saisie email
  if (etape === 'email') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Déclaration de disponibilités</CardTitle>
            <CardDescription>
              Étape 1/3 : Identification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Votre email UCLouvain *</Label>
              <Input
                id="email"
                type="email"
                placeholder="prenom.nom@uclouvain.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && chargerProfil()}
              />
            </div>
            <Button
              onClick={chargerProfil}
              disabled={!email.includes("@") || loading}
              className="w-full"
            >
              {loading ? "Vérification..." : "Continuer"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étape 2: Profil et quota
  if (etape === 'profil' && surveillant) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Profil confirmé</CardTitle>
            <CardDescription>
              Étape 2/3 : Vérification des informations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{surveillant.nom} {surveillant.prenom}</span>
                <Badge variant="secondary">{surveillant.type}</Badge>
              </div>
              <div className="text-sm text-gray-600">
                Email: {surveillant.email}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Quota théorique:</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {surveillant.quota} surveillance{surveillant.quota > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="telephone">Téléphone *</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+32476..."
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setModalOpen(true)}
                  title="Demander une modification"
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setEtape('email')}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={() => setEtape('disponibilites')}
                disabled={!telephone.match(/^[+]?[\d\s-()]+$/)}
                className="flex-1"
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>

        <DemandeModificationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          surveillantId={surveillant.id}
          email={email}
        />
      </div>
    );
  }

  // Étape 3: Sélection des disponibilités
  if (etape === 'disponibilites' && surveillant) {
    const semainesGroupees = grouperParSemaine();
    const nbSelectionnes = Object.values(disponibilites).filter(Boolean).length;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle>Sélection des disponibilités</CardTitle>
            <CardDescription>
              Étape 3/3 : Cochez vos créneaux disponibles ({nbSelectionnes} sélectionné{nbSelectionnes > 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={chargerCreneaux}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={debugData}
              >
                Debug données
              </Button>
            </div>

            {Object.keys(semainesGroupees).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun créneau de surveillance disponible pour cette session.</p>
                <p className="text-sm mt-2">Les examens doivent d'abord être validés par l'administration.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={chargerCreneaux}
                  className="mt-4"
                >
                  Recharger les créneaux
                </Button>
              </div>
            ) : (
              Object.entries(semainesGroupees).map(([semaine, creneauxSemaine]) => (
                <div key={semaine} className="space-y-3">
                  <h3 className="font-semibold text-gray-800 border-b pb-2">{semaine}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {creneauxSemaine.map(creneau => {
                      const key = `${creneau.date_surveillance}_${creneau.heure_debut_surveillance}_${creneau.heure_fin_surveillance}`;
                      const isSelected = disponibilites[key] || false;
                      
                      return (
                        <div
                          key={creneau.id}
                          className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => setDisponibilites(prev => ({ ...prev, [key]: !prev[key] }))}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="font-medium text-sm">
                                {formatDate(creneau.date_surveillance)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {creneau.heure_debut_surveillance} - {creneau.heure_fin_surveillance}
                              </div>
                              <div className="text-xs text-gray-500">
                                {creneau.matiere}
                                {creneau.nombre_examens > 1 && ` (+${creneau.nombre_examens - 1} autre${creneau.nombre_examens > 2 ? 's' : ''})`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEtape('profil')}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={sauvegarderDisponibilites}
                disabled={loading || nbSelectionnes === 0}
                className="flex-1"
              >
                {loading ? "Sauvegarde..." : `Enregistrer (${nbSelectionnes})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Étape finale: Confirmation
  if (etape === 'termine') {
    const nbSelectionnes = Object.values(disponibilites).filter(Boolean).length;
    
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Disponibilités enregistrées !</CardTitle>
            <CardDescription>
              Vos {nbSelectionnes} disponibilité{nbSelectionnes > 1 ? 's ont' : ' a'} été enregistrée{nbSelectionnes > 1 ? 's' : ''} avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                Merci d'avoir renseigné vos disponibilités. Vous recevrez une notification 
                dès que vos attributions seront confirmées.
              </p>
            </div>
            <Button
              onClick={() => {
                setEtape('email');
                setEmail('');
                setSurveillant(null);
                setDisponibilites({});
                setCreneaux([]);
              }}
              className="w-full"
            >
              Nouvelle déclaration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
