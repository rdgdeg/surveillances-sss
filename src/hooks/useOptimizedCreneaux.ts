
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

      // Pour chaque date d'examen
      datesExamens.forEach(date => {
        const examensDate = examens.filter(e => e.date_examen === date);
        const creneauxUtilises = new Set<string>();
        
        // Trier les examens par heure de début
        examensDate.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
        
        // Grouper les examens en plages horaires continues
        const groupesExamens: Array<typeof examensDate> = [];
        let groupeActuel: typeof examensDate = [];
        
        examensDate.forEach(examen => {
          if (groupeActuel.length === 0) {
            groupeActuel = [examen];
          } else {
            // Vérifier si cet examen peut être dans le même groupe de surveillance
            const dernierExamen = groupeActuel[groupeActuel.length - 1];
            const ecartMinutes = toMinutes(examen.heure_debut) - toMinutes(dernierExamen.heure_fin);
            
            // Si l'écart est inférieur à 2h, on peut les grouper dans le même créneau
            if (ecartMinutes <= 120) {
              groupeActuel.push(examen);
            } else {
              // Nouveau groupe
              groupesExamens.push([...groupeActuel]);
              groupeActuel = [examen];
            }
          }
        });
        
        // Ajouter le dernier groupe
        if (groupeActuel.length > 0) {
          groupesExamens.push(groupeActuel);
        }
        
        // Pour chaque groupe d'examens, trouver le créneau optimal
        groupesExamens.forEach(groupeExamens => {
          if (groupeExamens.length === 0) return;
          
          // Calculer les heures min/max nécessaires pour ce groupe
          const premierExamen = groupeExamens[0];
          const dernierExamen = groupeExamens[groupeExamens.length - 1];
          const heureDebutSurveillanceRequise = toMinutes(premierExamen.heure_debut) - 45;
          const heureFinRequise = toMinutes(dernierExamen.heure_fin);
          
          // Trouver le créneau configuré optimal (le plus petit qui peut couvrir tous les examens)
          let creneauOptimal = null;
          let tailleOptimale = Infinity;
          
          creneauxConfig.forEach(creneau => {
            const creneauDebutMin = toMinutes(creneau.heure_debut);
            const creneauFinMin = toMinutes(creneau.heure_fin);
            const tailleCreneau = creneauFinMin - creneauDebutMin;
            
            // Vérifier si ce créneau peut couvrir tous les examens du groupe
            const peutCouvrir = heureDebutSurveillanceRequise >= creneauDebutMin && 
                              heureFinRequise <= creneauFinMin;
            
            if (peutCouvrir && tailleCreneau < tailleOptimale) {
              creneauOptimal = creneau;
              tailleOptimale = tailleCreneau;
            }
          });
          
          // Ajouter le créneau optimal s'il existe et n'est pas déjà utilisé
          if (creneauOptimal) {
            const creneauKey = `${date}|${creneauOptimal.heure_debut}|${creneauOptimal.heure_fin}`;
            
            if (!creneauxUtilises.has(creneauKey)) {
              creneauxUtilises.add(creneauKey);
              
              optimizedCreneaux.push({
                type: 'surveillance',
                date_examen: date,
                heure_debut: creneauOptimal.heure_debut,
                heure_fin: creneauOptimal.heure_fin,
                heure_debut_surveillance: creneauOptimal.heure_debut,
                examens: groupeExamens
              });
            }
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
