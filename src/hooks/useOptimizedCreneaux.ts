
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
        console.log('[useOptimizedCreneaux] No examens found');
        return [];
      }

      // Grouper les examens par date
      const examensByDate = examens.reduce((acc, examen) => {
        if (!acc[examen.date_examen]) {
          acc[examen.date_examen] = [];
        }
        acc[examen.date_examen].push(examen);
        return acc;
      }, {} as Record<string, typeof examens>);

      console.log('[useOptimizedCreneaux] Examens grouped by date:', Object.keys(examensByDate));

      const optimizedCreneaux: OptimizedCreneau[] = [];

      // Pour chaque date d'examen, créer les créneaux basés sur les créneaux configurés
      Object.entries(examensByDate).forEach(([date, examensDate]) => {
        console.log(`[useOptimizedCreneaux] Processing date ${date} with ${examensDate.length} examens`);
        
        // Pour chaque créneau configuré, vérifier s'il peut couvrir des examens de cette date
        creneauxConfig.forEach(creneau => {
          const examensCouverts = examensDate.filter(examen => {
            const examDebut = parseInt(examen.heure_debut.replace(':', ''));
            const examFin = parseInt(examen.heure_fin.replace(':', ''));
            const creneauDebut = parseInt(creneau.heure_debut.replace(':', ''));
            const creneauFin = parseInt(creneau.heure_fin.replace(':', ''));
            
            // Le créneau doit pouvoir couvrir complètement l'examen
            return creneauDebut <= examDebut && creneauFin >= examFin;
          });

          // Si ce créneau peut couvrir au moins un examen de cette date, l'ajouter
          if (examensCouverts.length > 0) {
            console.log(`[useOptimizedCreneaux] Creneau ${creneau.heure_debut}-${creneau.heure_fin} covers ${examensCouverts.length} examens for date ${date}`);
            
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

      console.log(`[useOptimizedCreneaux] Generated ${optimizedCreneaux.length} optimized surveillance slots`);
      
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
