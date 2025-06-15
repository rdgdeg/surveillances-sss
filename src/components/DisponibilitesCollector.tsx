
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DemandeModificationModal } from "./DemandeModificationModal";

interface CreneauFusionne {
  id: string;
  date_surveillance: string;
  heure_debut_surveillance: string;
  heure_fin_surveillance: string;
}

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

type ModeCollector = "surveillant" | "public";

// Composant générique pour la collecte des disponibilités
export function DisponibilitesCollector({
  mode,
  surveillantInitial = null,
  onDone,
}: {
  mode: ModeCollector;
  surveillantInitial?: Surveillant | null;
  onDone?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [surveillant, setSurveillant] = useState<Surveillant | null>(surveillantInitial ?? null);
  const [creneaux, setCreneaux] = useState<CreneauFusionne[]>([]);
  const [dispos, setDispos] = useState<Record<string, { dispo: boolean; obligatoire: boolean; examenCode: string }>>({});
  const [telephone, setTelephone] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  
  // Nouveaux états pour les personnes inconnues
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [showUnknownPersonForm, setShowUnknownPersonForm] = useState(false);

  // Mode surveillant : auto-load profile
  useEffect(() => {
    if (mode === "surveillant" && email.includes("@")) {
      supabase
        .from("surveillants")
        .select("id,email,nom,prenom,type,telephone")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle()
        .then(async ({ data, error }) => {
          if (!error && data) {
            let quota = 0;
            let session_id = "";
            const { data: sessionRow } = await supabase
              .from("surveillant_sessions")
              .select("quota,session_id")
              .eq("surveillant_id", data.id)
              .eq("is_active", true)
              .maybeSingle();
            quota = sessionRow?.quota ?? 0;
            session_id = sessionRow?.session_id ?? "";
            setSurveillant({ ...data, quota, session_id });
            setTelephone(data.telephone || "");
            setShowUnknownPersonForm(false);
          } else {
            setSurveillant(null);
            setTelephone("");
            setShowUnknownPersonForm(true);
          }
        });
    }
    // Mode public: on laisse l'instanciation initiale agir (compte candidats)
  }, [mode, email]);

  // Récupérer tous les créneaux fusionnés
  useEffect(() => {
    supabase
      .from("creneaux_surveillance")
      .select("id,date_surveillance,heure_debut_surveillance,heure_fin_surveillance")
      .order("date_surveillance")
      .order("heure_debut_surveillance")
      .then(({ data, error }) => {
        if (!error && data) setCreneaux(data);
      });
  }, []);

  // Récupérer les disponibilités sauvegardées (si surveillant)
  useEffect(() => {
    if (surveillant) {
      supabase
        .from("disponibilites")
        .select("id,date_examen,heure_debut,heure_fin,est_disponible,commentaire_surveillance_obligatoire,nom_examen_obligatoire")
        .eq("surveillant_id", surveillant.id)
        .then(({ data }) => {
          const dispoObj: Record<string, { dispo: boolean; obligatoire: boolean; examenCode: string }> = {};
          (data || []).forEach(d => {
            const key = `${d.date_examen}|${d.heure_debut}|${d.heure_fin}`;
            dispoObj[key] = {
              dispo: d.est_disponible,
              obligatoire: !!d.commentaire_surveillance_obligatoire,
              examenCode: d.nom_examen_obligatoire || ""
            };
          });
          setDispos(dispoObj);
        });
    }
  }, [surveillant]);

  const handleDispoChange = (key: string, checked: boolean) => {
    setDispos(d => ({
      ...d,
      [key]: { ...d[key], dispo: checked }
    }));
  };
  const handleObligatoireChange = (key: string, checked: boolean) => {
    setDispos(d => ({
      ...d,
      [key]: { ...d[key], obligatoire: checked }
    }));
  };
  const handleCodeChange = (key: string, val: string) => {
    setDispos(d => ({
      ...d,
      [key]: { ...d[key], examenCode: val }
    }));
  };

  async function handleSave() {
    if (surveillant) {
      // Personne connue - sauvegarder les disponibilités
      if (!telephone.match(/^\+?\d+$/)) {
        toast({ title: "Erreur", description: "Numéro de téléphone obligatoire et valide.", variant: "destructive" });
        return;
      }
      await supabase
        .from("surveillants")
        .update({ telephone })
        .eq("id", surveillant.id);
      const updates = creneaux.map(cr => {
        const key = `${cr.date_surveillance}|${cr.heure_debut_surveillance}|${cr.heure_fin_surveillance}`;
        const d = dispos[key] || { dispo: false, obligatoire: false, examenCode: "" };
        return {
          surveillant_id: surveillant.id,
          session_id: surveillant.session_id ?? "",
          date_examen: cr.date_surveillance,
          heure_debut: cr.heure_debut_surveillance,
          heure_fin: cr.heure_fin_surveillance,
          est_disponible: d.dispo,
          commentaire_surveillance_obligatoire: d.obligatoire ? "Créneau obligatoire" : null,
          nom_examen_obligatoire: d.examenCode || null,
        };
      });
      await supabase.from("disponibilites").delete().eq("surveillant_id", surveillant.id);
      const { error } = await supabase.from("disponibilites").insert(updates);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sauvegardé", description: "Vos disponibilités ont été enregistrées." });
        onDone?.();
      }
    } else if (showUnknownPersonForm && nom && prenom && email && telephone) {
      // Personne inconnue - enregistrer comme candidat
      const { error } = await supabase
        .from("candidats_surveillance")
        .insert({
          nom,
          prenom,
          email: email.trim().toLowerCase(),
          telephone,
          statut: "candidat_externe",
        });
      
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Candidature enregistrée", 
          description: "Votre candidature a été enregistrée. L'administration vous contactera."
        });
        onDone?.();
      }
    }
  }

  // Organisation semaine (groupe par date)
  const semaineMap: Record<string, CreneauFusionne[]> = {};
  creneaux.forEach(cr => {
    if (!semaineMap[cr.date_surveillance]) semaineMap[cr.date_surveillance] = [];
    semaineMap[cr.date_surveillance].push(cr);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Déclarer mes disponibilités</CardTitle>
          <CardDescription>
            {mode === "surveillant"
              ? "Indiquez votre email pour charger votre profil ou créer une candidature."
              : "Remplissez ce formulaire pour déclarer vos disponibilités pour la surveillance des examens."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email (toujours requis pour identifier) */}
          {mode === "surveillant" && (
            <div className="flex flex-col space-y-2 mb-4">
              <Input placeholder="Votre email UCLouvain" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          )}

          {/* Profil surveillant connu */}
          {surveillant && (
            <div className="space-y-1 border p-3 rounded mb-3 bg-blue-50">
              <div className="flex space-x-3 items-center">
                <span className="font-bold">{surveillant.nom} {surveillant.prenom}</span>
                <Badge>{surveillant.type}</Badge>
                <Badge variant="secondary">Quota: {surveillant.quota || "?"}</Badge>
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  Demander une modification
                </Button>
              </div>
              <div>
                <label>Téléphone <span className="font-bold text-red-600">*</span> :</label>
                <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+324...." required />
              </div>
            </div>
          )}

          {/* Formulaire pour personne inconnue */}
          {showUnknownPersonForm && mode === "surveillant" && email.includes("@") && (
            <div className="border p-4 rounded mb-3 bg-yellow-50">
              <h3 className="font-semibold mb-3">Profil non trouvé - Créer une candidature</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Nom <span className="text-red-600">*</span></label>
                  <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" required />
                </div>
                <div>
                  <label className="block text-sm font-medium">Prénom <span className="text-red-600">*</span></label>
                  <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Votre prénom" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium">Téléphone <span className="text-red-600">*</span></label>
                  <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+324...." required />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Vos informations seront transmises à l'administration pour validation.
              </p>
            </div>
          )}

          <DemandeModificationModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            surveillantId={surveillant?.id || ""}
            email={email}
          />

          {/* Affichage des créneaux disponibles pour tous */}
          {Object.keys(semaineMap).length > 0 && (surveillant || showUnknownPersonForm) && (
            <div className="space-y-6">
              {Object.entries(semaineMap).map(([date, creneauxJournée]) => (
                <div key={date} className="border p-3 rounded mb-2">
                  <div className="font-semibold text-uclouvain-blue mb-2">{date}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {creneauxJournée.map(cr => {
                      const key = `${cr.date_surveillance}|${cr.heure_debut_surveillance}|${cr.heure_fin_surveillance}`;
                      const d = dispos[key] || { dispo: false, obligatoire: false, examenCode: "" };
                      return (
                        <div key={cr.id} className="flex items-center space-x-2 border p-2 rounded">
                          <Checkbox
                            checked={!!d.dispo}
                            onCheckedChange={val => handleDispoChange(key, !!val)}
                            disabled={showUnknownPersonForm} // Désactivé pour les candidats externes
                          />
                          <span>{cr.heure_debut_surveillance} - {cr.heure_fin_surveillance}</span>
                          {surveillant && (
                            <>
                              <span className="ml-2"> | </span>
                              <Checkbox
                                checked={!!d.obligatoire}
                                onCheckedChange={val => handleObligatoireChange(key, !!val)}
                              />
                              <span className="text-xs">Obligatoire</span>
                              {d.obligatoire && (
                                <Input
                                  className="ml-2 min-w-[120px]"
                                  placeholder="Code examen"
                                  value={d.examenCode}
                                  onChange={e => handleCodeChange(key, e.target.value)}
                                  size={8}
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button 
                className="mt-4" 
                onClick={handleSave}
                disabled={showUnknownPersonForm && (!nom || !prenom || !telephone)}
              >
                {surveillant ? "Enregistrer mes disponibilités" : "Envoyer ma candidature"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
