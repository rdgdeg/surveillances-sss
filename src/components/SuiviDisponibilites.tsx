import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "@/hooks/useSessions";
import { ClipboardCheck, Users, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuiviStatsOverview } from "./SuiviStatsOverview";
import { ListeDisponibilitesSurveillants } from "./ListeDisponibilitesSurveillants";

interface SurveillantDisponibilite {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  total_creneaux: number;
  creneaux_repondus: number;
  pourcentage_completion: number;
  derniere_reponse: string | null;
}

export const SuiviDisponibilites = () => {
  const { data: activeSession } = useActiveSession();
  const [surveillants, setSurveillants] = useState<SurveillantDisponibilite[]>([]);
  const [stats, setStats] = useState({
    total_surveillants: 0,
    ont_repondu: 0,
    completion_moyenne: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [totalCreneaux, setTotalCreneaux] = useState<number>(0);
  const [resetLoading, setResetLoading] = useState(false);

  // Récupérer le nombre de créneaux dans creneaux_surveillance avec le même critère que CollecteDisponibilites
  useEffect(() => {
    const fetchTotalCreneaux = async () => {
      if (!activeSession?.id) return;

      // Étape 1 : On récupère les examens actifs et validés
      const { data: examens, error: errExam } = await supabase
        .from('examens')
        .select('id')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE');

      if (errExam) {
        setTotalCreneaux(0);
        return;
      }
      const examenIds = (examens || []).map(e => e.id);

      if (!examenIds.length) {
        setTotalCreneaux(0);
        return;
      }

      // Étape 2 : On compte les créneaux liés à ces examens
      const { data: creneauxData, error: creneauxErr } = await supabase
        .from('creneaux_surveillance')
        .select('id')
        .in('examen_id', examenIds);

      if (creneauxErr) {
        setTotalCreneaux(0);
        return;
      }
      setTotalCreneaux((creneauxData || []).length);
    };
    fetchTotalCreneaux();
  }, [activeSession?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!activeSession?.id) return;

      try {
        // Récupérer tous les surveillants actifs pour cette session
        const { data: surveillantsData, error: surveillantsError } = await supabase
          .from('surveillant_sessions')
          .select(`
            surveillant_id,
            surveillants!inner(id, nom, prenom, email, type)
          `)
          .eq('session_id', activeSession.id)
          .eq('is_active', true)
          .neq('quota', 0);

        if (surveillantsError) throw surveillantsError;

        // Récupérer les examens de la session
        const { data: examens, error: examErr } = await supabase
          .from('examens')
          .select('id')
          .eq('session_id', activeSession.id);

        if (examErr) throw examErr;
        const examenIds = (examens || []).map(e => e.id);

        // Récupérer les créneaux de la session
        const { data: creneaux, error: crenErr } = await supabase
          .from('creneaux_surveillance')
          .select('id, examen_id, date_surveillance, heure_debut_surveillance, heure_fin_surveillance')
          .in('examen_id', examenIds);

        if (crenErr) throw crenErr;

        // total global
        const totalPourSession = (creneaux || []).length;

        // Pour chaque surveillant, compter les dispos sur les créneaux de la session
        const surveillantsWithStats = await Promise.all(
          (surveillantsData || []).map(async (item) => {
            const surveillant = item.surveillants;
            // combien de créneaux pour lesquels il a déclaré une dispo
            let creneauxRepondus = 0;
            if (creneaux && creneaux.length) {
              // On compte les dispos pour ce surveillant sur ces créneaux (date/heure)
              const dispoRes = await supabase
                .from('disponibilites')
                .select('date_examen, heure_debut, heure_fin')
                .eq('surveillant_id', surveillant.id)
                .eq('session_id', activeSession.id)
                .eq('est_disponible', true);

              if (dispoRes.error) throw dispoRes.error;
              // Matching créneau/dispo
              creneauxRepondus = (dispoRes.data || []).filter(dispo =>
                creneaux.some(c =>
                  c.date_surveillance === dispo.date_examen &&
                  c.heure_debut_surveillance === dispo.heure_debut &&
                  c.heure_fin_surveillance === dispo.heure_fin
                )
              ).length;
            }

            // Récupérer la dernière réponse
            const { data: derniereReponse } = await supabase
              .from('disponibilites')
              .select('updated_at')
              .eq('surveillant_id', surveillant.id)
              .eq('session_id', activeSession.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            const pourcentage = totalPourSession > 0
              ? Math.round((creneauxRepondus / totalPourSession) * 100)
              : 0;

            return {
              id: surveillant.id,
              nom: surveillant.nom,
              prenom: surveillant.prenom,
              email: surveillant.email,
              type: surveillant.type,
              total_creneaux: totalPourSession,
              creneaux_repondus: creneauxRepondus,
              pourcentage_completion: pourcentage,
              derniere_reponse: derniereReponse?.updated_at || null
            };
          })
        );

        setSurveillants(surveillantsWithStats);

        // Stats globales
        const totalSurveillants = surveillantsWithStats.length;
        const ontRepondu = surveillantsWithStats.filter(s => s.pourcentage_completion > 0).length;
        const completionMoyenne = surveillantsWithStats.reduce((sum, s) => sum + s.pourcentage_completion, 0) / (totalSurveillants || 1);

        setStats({
          total_surveillants: totalSurveillants,
          ont_repondu: ontRepondu,
          completion_moyenne: Math.round(completionMoyenne || 0)
        });

      } catch (error: any) {
        console.error('Erreur chargement disponibilités:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeSession?.id, totalCreneaux]);

  // Nouvelle fonction : archivage puis purge des disponibilités
  const handleResetDisponibilites = async () => {
    if (!activeSession?.id) return;
    if (!confirm("Remise à zéro des disponibilités pour toute la session ? (celles-ci seront archivées avant suppression)")) return;
    setResetLoading(true);

    // 1. Récupérer toutes les dispos de la session
    const { data: toArchive, error: fetchError } = await supabase
      .from('disponibilites')
      .select('*')
      .eq('session_id', activeSession.id);

    if (fetchError) {
      alert("Erreur récupération pour archivage: " + fetchError.message);
      setResetLoading(false);
      return;
    }

    // 2. Archiver toutes les lignes si présent
    if (toArchive && toArchive.length > 0) {
      // Préparer pour insertion en bloc (copier tous les champs)
      const archives = toArchive.map((d: any) => ({
        ...d,
        archivé_le: new Date().toISOString(),
      }));
      const { error: archiveError } = await supabase
        .from('disponibilites_archive')
        .insert(archives);

      if (archiveError) {
        alert("Erreur archivage des disponibilités: " + archiveError.message);
        setResetLoading(false);
        return;
      }
    }

    // 3. Purger
    const { error } = await supabase
      .from('disponibilites')
      .delete()
      .eq('session_id', activeSession.id);

    if (error) {
      alert("Erreur purge disponibilités: " + error.message);
      setResetLoading(false);
      return;
    }
    alert("Disponibilités archivées et supprimées pour la session !");
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
    setResetLoading(false);
  };

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Veuillez d'abord sélectionner une session active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Chargement des disponibilités...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bouton Debug (admin): remise à zéro des disponibilités */}
      <div className="flex justify-end mb-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleResetDisponibilites}
          disabled={resetLoading}
        >Remise à zéro des disponibilités (session)</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardCheck className="h-5 w-5" />
            <span>Suivi des Disponibilités</span>
          </CardTitle>
          <CardDescription>
            Progression de la collecte des disponibilités par surveillant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuiviStatsOverview stats={stats} totalCreneaux={totalCreneaux} />
          <ListeDisponibilitesSurveillants surveillants={surveillants} />
        </CardContent>
      </Card>
    </div>
  );
};

// Export du type pour le sous-composant
export type { SurveillantDisponibilite };
