
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
import { User, Calendar, CheckSquare, Phone, AlertCircle, RefreshCw, Edit, Info } from "lucide-react";

interface Surveillant {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  type: string;
  telephone: string | null;
  quota: number;
  session_id: string;
  eft?: number;
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
  const [disponibilites, setDisponibilites] = useState<Record<string, { dispo: boolean; type_choix: string; nom_examen: string }>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // États pour utilisateur inconnu
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [isUnknownUser, setIsUnknownUser] = useState(false);

  // Charger le profil surveillant
  const chargerProfil = async () => {
    if (!email.includes("@")) return;
    
    setLoading(true);
    try {
      const { data: surveillantData, error } = await supabase
        .from("surveillants")
        .select("id,email,nom,prenom,type,telephone,eft")
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
        setIsUnknownUser(false);
        setEtape('profil');
      } else {
        // Utilisateur inconnu - permettre de continuer
        setIsUnknownUser(true);
        setSurveillant(null);
        setEtape('profil');
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
    if ((surveillant?.session_id || isUnknownUser) && etape === 'disponibilites') {
      chargerCreneaux();
    }
  }, [surveillant?.session_id, isUnknownUser, etape]);

  const chargerCreneaux = async () => {
    try {
      // Récupérer la session active
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!activeSession) {
        toast({
          title: "Aucune session active",
          description: "Aucune session d'examens n'est actuellement active.",
          variant: "destructive"
        });
        return;
      }

      // Récupérer les examens validés et actifs pour cette session
      const { data: examensData, error: examensError } = await supabase
        .from('examens')
        .select('id, date_examen, heure_debut, heure_fin, matiere')
        .eq('session_id', activeSession.id)
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
        setCreneaux([]);
        toast({
          title: "Aucun créneau disponible",
          description: "Aucun examen validé n'a été trouvé pour cette session.",
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

      // Charger les disponibilités existantes si utilisateur connu
      if (surveillant?.id) {
        const { data: dispoData } = await supabase
          .from('disponibilites')
          .select('date_examen, heure_debut, heure_fin, type_choix, nom_examen_selectionne')
          .eq('surveillant_id', surveillant.id)
          .eq('session_id', surveillant.session_id)
          .eq('est_disponible', true);

        const dispoObj: Record<string, { dispo: boolean; type_choix: string; nom_examen: string }> = {};
        (dispoData || []).forEach(d => {
          const key = `${d.date_examen}_${d.heure_debut}_${d.heure_fin}`;
          dispoObj[key] = {
            dispo: true,
            type_choix: d.type_choix || 'souhaitee',
            nom_examen: d.nom_examen_selectionne || ''
          };
        });
        setDisponibilites(dispoObj);
      }

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
      let usedSurveillantId = surveillant?.id;

      // Si utilisateur inconnu, créer le profil
      if (isUnknownUser) {
        if (!nom || !prenom) {
          toast({
            title: "Champs requis",
            description: "Veuillez remplir le nom et prénom.",
            variant: "destructive"
          });
          return;
        }

        const { data: newSurveillant, error: createError } = await supabase
          .from('surveillants')
          .insert({
            email: email.trim().toLowerCase(),
            nom,
            prenom,
            telephone,
            statut: 'candidat',
            type: 'Candidat'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        usedSurveillantId = newSurveillant.id;
      } else if (surveillant?.id) {
        // Mettre à jour le téléphone pour utilisateur connu
        await supabase
          .from("surveillants")
          .update({ telephone })
          .eq("id", surveillant.id);
      }

      if (!usedSurveillantId) {
        throw new Error("Impossible de déterminer l'ID du surveillant");
      }

      // Récupérer la session active
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!activeSession) {
        throw new Error("Aucune session active trouvée");
      }

      // Supprimer les disponibilités existantes
      await supabase
        .from("disponibilites")
        .delete()
        .eq("surveillant_id", usedSurveillantId)
        .eq("session_id", activeSession.id);

      // Insérer les nouvelles disponibilités
      const nouvellesDispos = creneaux
        .filter(creneau => {
          const key = `${creneau.date_surveillance}_${creneau.heure_debut_surveillance}_${creneau.heure_fin_surveillance}`;
          return disponibilites[key]?.dispo;
        })
        .map(creneau => {
          const key = `${creneau.date_surveillance}_${creneau.heure_debut_surveillance}_${creneau.heure_fin_surveillance}`;
          const dispo = disponibilites[key];
          return {
            surveillant_id: usedSurveillantId,
            session_id: activeSession.id,
            date_examen: creneau.date_surveillance,
            heure_debut: creneau.heure_debut_surveillance,
            heure_fin: creneau.heure_fin_surveillance,
            est_disponible: true,
            type_choix: dispo.type_choix || 'souhaitee',
            nom_examen_selectionne: dispo.nom_examen || ''
          };
        });

      if (nouvellesDispos.length > 0) {
        const { error } = await supabase
          .from("disponibilites")
          .insert(nouvellesDispos);

        if (error) throw error;
      }

      toast({
        title: "Sauvegardé",
        description: isUnknownUser 
          ? "Votre envoi de disponibilités a été enregistré avec succès."
          : "Vos disponibilités ont été enregistrées avec succès.",
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
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>Important :</strong> Pour être reconnu dans notre système, utilisez impérativement votre adresse email UCLouvain (@uclouvain.be) ou votre adresse de contrat jobiste si vous en avez une.
                </div>
              </div>
            </div>
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
  if (etape === 'profil') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>
              {isUnknownUser ? "Profil non trouvé - Envoi des disponibilités" : "Profil confirmé"}
            </CardTitle>
            <CardDescription>
              Étape 2/3 : {isUnknownUser ? "Envoi de vos disponibilités" : "Vérification des informations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {surveillant && !isUnknownUser ? (
              // Profil connu
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="text-green-700 font-bold mb-2">✓ Profil trouvé dans notre base de données</div>
                <div className="text-xs font-normal text-gray-600 mb-3">
                  Voici vos informations enregistrées. Si elles ne sont pas correctes, vous pouvez demander une modification.
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{surveillant.nom} {surveillant.prenom}</span>
                  <Badge variant="secondary">{surveillant.type}</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Email: {surveillant.email}
                </div>
                {surveillant.eft && (
                  <div className="text-sm text-gray-600">
                    EFT: {(surveillant.eft * 100).toFixed(0)}%
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quota théorique:</span>
                  <Badge className="bg-orange-100 text-orange-800">
                    {surveillant.quota} surveillance{surveillant.quota > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="mt-3 text-xs text-gray-800 p-2 rounded bg-yellow-50 border border-yellow-300">
                  <strong>⚠️ Informations incorrectes ?</strong> Si une information ne vous semble pas correcte 
                  (nom, prénom, type, EFT, quota, etc.), cliquez sur le bouton 
                  <span className="font-semibold"> "Demander une modification" </span>
                  ci-dessous.
                </div>

                {/* Bouton de modification plus visible */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setModalOpen(true)}
                    className="w-full border-orange-500 text-orange-700 hover:bg-orange-50 font-medium"
                    size="lg"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Demander une modification de mes informations
                  </Button>
                </div>
              </div>
            ) : (
              // Profil inconnu
              <div className="border p-4 rounded mb-3 bg-yellow-50">
                <div className="text-orange-700 font-bold mb-1">👤 Profil non trouvé - Envoi des disponibilités</div>
                <div className="text-sm text-gray-600 mb-3">
                  Votre email n'est pas dans notre base de données. Vous pouvez tout de même nous envoyer vos disponibilités en remplissant vos informations ci-dessous.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">Nom <span className="text-red-600">*</span></label>
                    <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Prénom <span className="text-red-600">*</span></label>
                    <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Votre prénom" required />
                  </div>
                </div>
                <p className="text-sm text-green-700 mt-2 font-medium">
                  ✓ Vos informations seront transmises à l'administration pour validation.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="telephone">Téléphone *</Label>
              <div className="space-y-2">
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="+32476..."
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <Phone className="h-3 w-3 inline mr-1" />
                  Votre numéro ne sera pas communiqué, mais uniquement utilisé en cas de souci (annulation de dernière minute, changement des consignes, etc.)
                </div>
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
                disabled={!telephone.match(/^[+]?[\d\s-()]+$/) || (isUnknownUser && (!nom || !prenom))}
                className="flex-1"
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>

        {surveillant && !isUnknownUser && (
          <DemandeModificationModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            surveillantId={surveillant.id}
            email={email}
          />
        )}
      </div>
    );
  }

  // Étape 3: Sélection des disponibilités
  if (etape === 'disponibilites') {
    const semainesGroupees = grouperParSemaine();
    const nbSelectionnes = Object.values(disponibilites).filter(d => d.dispo).length;

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
                  <div className="space-y-3">
                    {creneauxSemaine.map(creneau => {
                      const key = `${creneau.date_surveillance}_${creneau.heure_debut_surveillance}_${creneau.heure_fin_surveillance}`;
                      const dispo = disponibilites[key] || { dispo: false, type_choix: 'souhaitee', nom_examen: '' };
                      
                      return (
                        <div
                          key={creneau.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            dispo.dispo ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={dispo.dispo}
                              onCheckedChange={(checked) => 
                                setDisponibilites(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], dispo: !!checked, type_choix: prev[key]?.type_choix || 'souhaitee', nom_examen: prev[key]?.nom_examen || '' }
                                }))
                              }
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <Badge variant="outline">
                                  {formatDate(creneau.date_surveillance)}
                                </Badge>
                                <Badge variant="outline">
                                  Surveillance: {creneau.heure_debut_surveillance} - {creneau.heure_fin_surveillance}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {creneau.matiere}
                                {creneau.nombre_examens > 1 && ` (+${creneau.nombre_examens - 1} autre${creneau.nombre_examens > 2 ? 's' : ''})`}
                              </div>

                              {dispo.dispo && (
                                <div className="bg-blue-50 p-3 rounded-md space-y-3">
                                  {/* Case à cocher facultative pour spécifier si c'est obligatoire/souhaité */}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`specify-${key}`}
                                      checked={dispo.type_choix !== 'souhaitee' || !!dispo.nom_examen}
                                      onCheckedChange={(checked) => {
                                        if (!checked) {
                                          setDisponibilites(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], type_choix: 'souhaitee', nom_examen: '' }
                                          }));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`specify-${key}`} className="text-sm font-medium cursor-pointer">
                                      Ce créneau est une surveillance obligatoire ou souhaitée
                                    </Label>
                                  </div>

                                  {(dispo.type_choix !== 'souhaitee' || !!dispo.nom_examen) && (
                                    <div className="space-y-3 ml-6">
                                      <div className="flex items-center space-x-3">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`type_${key}`}
                                            checked={dispo.type_choix === "obligatoire"}
                                            onChange={() => 
                                              setDisponibilites(prev => ({
                                                ...prev,
                                                [key]: { ...prev[key], type_choix: "obligatoire" }
                                              }))
                                            }
                                            className="accent-red-500"
                                          />
                                          <span>Obligatoire</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`type_${key}`}
                                            checked={dispo.type_choix === "souhaitee"}
                                            onChange={() => 
                                              setDisponibilites(prev => ({
                                                ...prev,
                                                [key]: { ...prev[key], type_choix: "souhaitee" }
                                              }))
                                            }
                                            className="accent-green-500"
                                          />
                                          <span>Souhaité</span>
                                        </label>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Code cours ou nom de l'examen
                                        </label>
                                        <Input
                                          placeholder="Ex: LMATH1102 ou Mathématiques"
                                          value={dispo.nom_examen || ""}
                                          onChange={e => 
                                            setDisponibilites(prev => ({
                                              ...prev,
                                              [key]: { ...prev[key], nom_examen: e.target.value }
                                            }))
                                          }
                                          className="text-sm"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
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
    const nbSelectionnes = Object.values(disponibilites).filter(d => d.dispo).length;
    
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-800">
              {isUnknownUser ? "Disponibilités enregistrées !" : "Disponibilités enregistrées !"}
            </CardTitle>
            <CardDescription>
              {isUnknownUser 
                ? "Vos disponibilités ont été transmises à l'administration."
                : `Vos ${nbSelectionnes} disponibilité${nbSelectionnes > 1 ? 's ont' : ' a'} été enregistrée${nbSelectionnes > 1 ? 's' : ''} avec succès.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                {isUnknownUser 
                  ? "Merci pour votre envoi de disponibilités. L'administration examinera votre dossier et vous contactera."
                  : "Merci d'avoir renseigné vos disponibilités. Vous recevrez une notification dès que vos attributions seront confirmées."
                }
              </p>
            </div>
            <Button
              onClick={() => {
                setEtape('email');
                setEmail('');
                setSurveillant(null);
                setDisponibilites({});
                setCreneaux([]);
                setIsUnknownUser(false);
                setNom('');
                setPrenom('');
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
