
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OptimizedCreneau {
  type: 'surveillance' | 'examen';
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_surveillance?: string;
  examens: Array<{
    id: string;
    code_examen: string;
    matiere: string;
    salle: string;
    heure_debut: string;
    heure_fin: string;
    nombre_surveillants: number;
    surveillants_enseignant: number;
    surveillants_amenes: number;
    surveillants_pre_assignes: number;
  }>;
}

export const useOptimizedCreneaux = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux', sessionId],
    queryFn: async (): Promise<OptimizedCreneau[]> => {
      if (!sessionId) return [];
      
      console.log('[useOptimizedCreneaux] Fetching creneaux_surveillance_config for session:', sessionId);
      
      // Récupérer les créneaux de surveillance configurés et validés
      const { data: creneauxConfig, error: creneauxError } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');

      if (creneauxError) {
        console.error('[useOptimizedCreneaux] Error fetching creneaux config:', creneauxError);
        throw creneauxError;
      }

      console.log('[useOptimizedCreneaux] Found configured creneaux:', creneauxConfig?.length || 0);

      if (!creneauxConfig || creneauxConfig.length === 0) {
        console.log('[useOptimizedCreneaux] No configured creneaux found');
        return [];
      }

      // Récupérer tous les examens validés pour cette session
      const { data: examens, error: examensError } = await supabase
        .from('examens')
        .select(`
          id, code_examen, matiere, salle, date_examen, heure_debut, heure_fin,
          nombre_surveillants, surveillants_enseignant, surveillants_amenes, surveillants_pre_assignes
        `)
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .eq('statut_validation', 'VALIDE')
        .order('date_examen')
        .order('heure_debut');

      if (examensError) {
        console.error('[useOptimizedCreneaux] Error fetching examens:', examensError);
        throw examensError;
      }

      console.log('[useOptimizedCreneaux] Found examens:', examens?.length || 0);

      if (!examens || examens.length === 0) {
        return [];
      }

      const optimizedCreneaux: OptimizedCreneau[] = [];

      // Récupérer toutes les dates d'examens uniques
      const datesExamens = [...new Set(examens.map(e => e.date_examen))].sort();

      // Pour chaque date d'examen, créer exactement les créneaux configurés qui ont des examens
      datesExamens.forEach(date => {
        const examensDate = examens.filter(e => e.date_examen === date);
        
        creneauxConfig.forEach(creneau => {
          // Vérifier si ce créneau a des examens pour cette date
          const examensCouverts = examensDate.filter(examen => {
            const toMinutes = (time: string) => {
              const [h, m] = time.split(':').map(Number);
              return h * 60 + m;
            };

            const creneauDebutMin = toMinutes(creneau.heure_debut);
            const creneauFinMin = toMinutes(creneau.heure_fin);
            const examDebutMin = toMinutes(examen.heure_debut);
            const examFinMin = toMinutes(examen.heure_fin);

            // Le créneau doit pouvoir couvrir complètement l'examen (avec 45min avant)
            const debutSurveillanceMin = examDebutMin - 45;
            return debutSurveillanceMin >= creneauDebutMin && examFinMin <= creneauFinMin;
          });

          // Ajouter le créneau seulement s'il a des examens
          if (examensCouverts.length > 0) {
            optimizedCreneaux.push({
              type: 'surveillance',
              date_examen: date,
              heure_debut: creneau.heure_debut,
              heure_fin: creneau.heure_fin,
              heure_debut_surveillance: creneau.heure_debut,
              examens: examensCouverts
            });
          }
        });
      });

      console.log(`[useOptimizedCreneaux] Generated ${optimizedCreneaux.length} surveillance slots from configured creneaux`);
      
      // Trier par date puis par heure
      optimizedCreneaux.sort((a, b) => {
        const dateCompare = a.date_examen.localeCompare(b.date_examen);
        if (dateCompare !== 0) return dateCompare;
        return a.heure_debut.localeCompare(b.heure_debut);
      });

      return optimizedCreneaux;
    },
    enabled: !!sessionId
  });
};
