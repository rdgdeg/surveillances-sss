
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

      // Fonction utilitaire pour convertir l'heure en minutes
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      // Récupérer toutes les dates d'examens uniques
      const datesExamens = [...new Set(examens.map(e => e.date_examen))].sort();

      console.log('[useOptimizedCreneaux] Processing dates:', datesExamens);

      // Pour chaque date d'examen
      datesExamens.forEach(date => {
        const examensDate = examens.filter(e => e.date_examen === date);
        console.log(`[useOptimizedCreneaux] Processing date ${date} with ${examensDate.length} examens`);
        
        // Grouper les examens par plages horaires contiguës
        const plagesHoraires: Array<{
          heureDebutMin: number;
          heureFinMax: number;
          examens: typeof examensDate;
        }> = [];
        
        examensDate.forEach(examen => {
          const examenDebutMin = toMinutes(examen.heure_debut);
          const examenFinMin = toMinutes(examen.heure_fin);
          
          // Chercher une plage existante qui peut inclure cet examen
          let plageExistante = plagesHoraires.find(plage => {
            const debutSurveillanceMin = examenDebutMin - 45;
            return (
              debutSurveillanceMin <= plage.heureFinMax + 60 && // Tolérance de 1h entre les plages
              examenFinMin >= plage.heureDebutMin - 60
            );
          });
          
          if (plageExistante) {
            // Étendre la plage existante
            plageExistante.heureDebutMin = Math.min(plageExistante.heureDebutMin, examenDebutMin - 45);
            plageExistante.heureFinMax = Math.max(plageExistante.heureFinMax, examenFinMin);
            plageExistante.examens.push(examen);
          } else {
            // Créer une nouvelle plage
            plagesHoraires.push({
              heureDebutMin: examenDebutMin - 45, // 45min de préparation
              heureFinMax: examenFinMin,
              examens: [examen]
            });
          }
        });
        
        // Pour chaque plage horaire, trouver le créneau configuré optimal
        plagesHoraires.forEach(plage => {
          // Trouver le créneau configuré qui peut couvrir cette plage avec la marge minimale
          const creneauOptimal = creneauxConfig.find(creneauConfig => {
            const creneauDebutMin = toMinutes(creneauConfig.heure_debut);
            const creneauFinMin = toMinutes(creneauConfig.heure_fin);
            
            return creneauDebutMin <= plage.heureDebutMin && creneauFinMin >= plage.heureFinMax;
          });
          
          if (creneauOptimal) {
            console.log(`[useOptimizedCreneaux] Creating optimal slot for ${date} ${creneauOptimal.heure_debut}-${creneauOptimal.heure_fin} covering ${plage.examens.length} examens`);
            
            optimizedCreneaux.push({
              type: 'surveillance',
              date_examen: date,
              heure_debut: creneauOptimal.heure_debut,
              heure_fin: creneauOptimal.heure_fin,
              heure_debut_surveillance: creneauOptimal.heure_debut,
              examens: plage.examens
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
