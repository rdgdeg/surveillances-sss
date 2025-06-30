
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSession } from "./useSessions";

export interface CreneauManuel {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  nom_creneau?: string;
  description?: string;
  examens: Array<{
    id: string;
    matiere: string;
    salle: string;
    heure_debut: string;
    heure_fin: string;
  }>;
}

export const useManualCreneaux = () => {
  const { data: activeSession } = useActiveSession();

  return useQuery({
    queryKey: ['creneaux-manuels', activeSession?.id],
    queryFn: async (): Promise<CreneauManuel[]> => {
      if (!activeSession?.id) return [];

      // Récupérer tous les créneaux validés avec leurs examens associés
      const { data: associations, error } = await supabase
        .from('creneaux_examens')
        .select(`
          *,
          creneaux_surveillance_config!inner (
            id,
            heure_debut,
            heure_fin,
            nom_creneau,
            description,
            is_active,
            is_validated
          ),
          examens!inner (
            id,
            matiere,
            salle,
            date_examen,
            heure_debut,
            heure_fin,
            session_id
          )
        `)
        .eq('examens.session_id', activeSession.id)
        .eq('creneaux_surveillance_config.is_active', true)
        .eq('creneaux_surveillance_config.is_validated', true);

      if (error) throw error;

      // Grouper par date et créneau
      const creneauxParDate: Record<string, Record<string, CreneauManuel>> = {};

      associations?.forEach(assoc => {
        const exam = assoc.examens;
        const creneau = assoc.creneaux_surveillance_config;
        const date = exam.date_examen;
        const creneauId = creneau.id;

        if (!creneauxParDate[date]) {
          creneauxParDate[date] = {};
        }

        if (!creneauxParDate[date][creneauId]) {
          creneauxParDate[date][creneauId] = {
            id: `${date}-${creneauId}`,
            date,
            heure_debut: creneau.heure_debut,
            heure_fin: creneau.heure_fin,
            nom_creneau: creneau.nom_creneau || undefined,
            description: creneau.description || undefined,
            examens: []
          };
        }

        creneauxParDate[date][creneauId].examens.push({
          id: exam.id,
          matiere: exam.matiere,
          salle: exam.salle,
          heure_debut: exam.heure_debut,
          heure_fin: exam.heure_fin
        });
      });

      // Convertir en tableau trié
      const result: CreneauManuel[] = [];
      Object.keys(creneauxParDate)
        .sort()
        .forEach(date => {
          Object.keys(creneauxParDate[date])
            .sort((a, b) => {
              const creneauA = creneauxParDate[date][a];
              const creneauB = creneauxParDate[date][b];
              return creneauA.heure_debut.localeCompare(creneauB.heure_debut);
            })
            .forEach(creneauId => {
              result.push(creneauxParDate[date][creneauId]);
            });
        });

      return result;
    },
    enabled: !!activeSession?.id
  });
};

// Hook pour récupérer les créneaux disponibles (pour la collecte de disponibilités)
export const useCreneauxDisponibles = () => {
  const { data: activeSession } = useActiveSession();

  return useQuery({
    queryKey: ['creneaux-disponibles', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeSession?.id
  });
};
