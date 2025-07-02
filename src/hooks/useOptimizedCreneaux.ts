
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

// Créneaux fixes étendus pour une meilleure couverture
const CRENEAUX_FIXES = [
  { debut: '07:30', fin: '10:30' },
  { debut: '07:30', fin: '11:30' },
  { debut: '07:30', fin: '12:30' },
  { debut: '07:30', fin: '13:30' },
  { debut: '08:30', fin: '11:30' },
  { debut: '08:30', fin: '12:30' },
  { debut: '08:30', fin: '13:30' },
  { debut: '09:30', fin: '12:30' },
  { debut: '09:30', fin: '13:30' },
  { debut: '10:30', fin: '13:30' },
  { debut: '12:15', fin: '15:00' }, // Ajouté pour les examens 13h-15h
  { debut: '12:15', fin: '16:00' }, // Ajouté pour les examens 13h-16h
  { debut: '12:15', fin: '17:00' },
  { debut: '12:15', fin: '18:00' }, // Couverture maximale
  { debut: '13:15', fin: '16:00' },
  { debut: '13:15', fin: '17:00' },
  { debut: '13:15', fin: '18:00' },
  { debut: '14:15', fin: '17:00' },
  { debut: '14:15', fin: '18:00' },
  { debut: '15:15', fin: '18:00' },
  { debut: '16:15', fin: '19:00' },
  { debut: '17:15', fin: '20:00' },
  { debut: '18:15', fin: '21:00' },
];

export const useOptimizedCreneaux = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux', sessionId],
    queryFn: async (): Promise<OptimizedCreneau[]> => {
      if (!sessionId) return [];
      
      console.log('[useOptimizedCreneaux] Fetching creneaux_surveillance_config for session:', sessionId);
      
      // D'abord, récupérer les créneaux de surveillance configurés et validés
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

      // Si nous avons des créneaux configurés, essayons de les utiliser
      if (creneauxConfig && creneauxConfig.length > 0) {
        // Récupérer les associations créneaux-examens
        const { data: associations, error: assocError } = await supabase
          .from('creneaux_examens')
          .select(`
            creneau_id,
            examen_id,
            examens (
              id, code_examen, matiere, salle, date_examen, heure_debut, heure_fin,
              nombre_surveillants, surveillants_enseignant, surveillants_amenes, surveillants_pre_assignes
            )
          `)
          .in('creneau_id', creneauxConfig.map(c => c.id));

        if (!assocError && associations && associations.length > 0) {
          console.log('[useOptimizedCreneaux] Found associations:', associations.length);

          // Créer les créneaux optimisés basés sur les créneaux configurés
          const optimizedCreneaux: OptimizedCreneau[] = [];

          // Grouper les associations par créneau
          const associationsByCreneauId = associations.reduce((acc, assoc) => {
            if (!acc[assoc.creneau_id]) {
              acc[assoc.creneau_id] = [];
            }
            if (assoc.examens) {
              acc[assoc.creneau_id].push(assoc.examens);
            }
            return acc;
          }, {} as Record<string, any[]>);

          // Pour chaque créneau configuré, créer les créneaux optimisés
          creneauxConfig.forEach(creneau => {
            const examensAssocies = associationsByCreneauId[creneau.id] || [];
            
            if (examensAssocies.length > 0) {
              // Grouper les examens par date
              const examensByDate = examensAssocies.reduce((acc, examen: any) => {
                if (!acc[examen.date_examen]) {
                  acc[examen.date_examen] = [];
                }
                acc[examen.date_examen].push(examen);
                return acc;
              }, {} as Record<string, any[]>);

              // Créer un créneau optimisé pour chaque date
              Object.entries(examensByDate).forEach(([date, examensDate]: [string, any[]]) => {
                optimizedCreneaux.push({
                  type: 'surveillance',
                  date_examen: date,
                  heure_debut: creneau.heure_debut,
                  heure_fin: creneau.heure_fin,
                  heure_debut_surveillance: creneau.heure_debut,
                  examens: examensDate
                });
              });
            }
          });

          if (optimizedCreneaux.length > 0) {
            console.log(`[useOptimizedCreneaux] Generated ${optimizedCreneaux.length} optimized surveillance slots from configured creneaux`);
            
            // Trier par date puis par heure
            optimizedCreneaux.sort((a, b) => {
              const dateCompare = a.date_examen.localeCompare(b.date_examen);
              if (dateCompare !== 0) return dateCompare;
              return a.heure_debut.localeCompare(b.heure_debut);
            });

            return optimizedCreneaux;
          }
        }

        console.log('[useOptimizedCreneaux] No associations found or no valid examens, falling back to direct method');
      }

      // FALLBACK : Si pas de créneaux configurés ou pas d'associations, utiliser l'ancienne méthode
      console.log('[useOptimizedCreneaux] Using fallback method - fetching examens directly');
      
      const { data: examens, error } = await supabase
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

      if (error) {
        console.error('[useOptimizedCreneaux] Error fetching examens:', error);
        throw error;
      }

      console.log('[useOptimizedCreneaux] Found examens:', examens?.length || 0);

      if (!examens || examens.length === 0) {
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

      const optimizedCreneaux: OptimizedCreneau[] = [];

      // Pour chaque date, créer les créneaux optimisés
      Object.entries(examensByDate).forEach(([date, examensDate]) => {
        console.log(`[useOptimizedCreneaux] Processing date ${date} with ${examensDate.length} examens`);
        
        // Créer les créneaux de surveillance basés sur les créneaux fixes
        const creneauxSurveillanceUtilises = new Set<string>();
        
        examensDate.forEach(examen => {
          // Trouver les créneaux fixes qui peuvent couvrir cet examen
          const creneauxCompatibles = CRENEAUX_FIXES.filter(creneau => {
            const examDebut = parseInt(examen.heure_debut.replace(':', ''));
            const examFin = parseInt(examen.heure_fin.replace(':', ''));
            const creneauDebut = parseInt(creneau.debut.replace(':', ''));
            const creneauFin = parseInt(creneau.fin.replace(':', ''));
            
            // Le créneau doit commencer avant l'examen et finir après ou en même temps
            return creneauDebut <= examDebut && creneauFin >= examFin;
          });
          
          // Pour chaque créneau compatible, créer ou enrichir le créneau optimisé
          creneauxCompatibles.forEach(creneau => {
            const creneauKey = `${date}_${creneau.debut}_${creneau.fin}`;
            
            if (!creneauxSurveillanceUtilises.has(creneauKey)) {
              creneauxSurveillanceUtilises.add(creneauKey);
              
              // Trouver tous les examens qui peuvent être couverts par ce créneau
              const examensCouverts = examensDate.filter(ex => {
                const examDebut = parseInt(ex.heure_debut.replace(':', ''));
                const examFin = parseInt(ex.heure_fin.replace(':', ''));
                const creneauDebut = parseInt(creneau.debut.replace(':', ''));
                const creneauFin = parseInt(creneau.fin.replace(':', ''));
                
                return creneauDebut <= examDebut && creneauFin >= examFin;
              });
              
              optimizedCreneaux.push({
                type: 'surveillance',
                date_examen: date,
                heure_debut: creneau.debut,
                heure_fin: creneau.fin,
                heure_debut_surveillance: creneau.debut,
                examens: examensCouverts
              });
            }
          });
        });
      });

      console.log(`[useOptimizedCreneaux] Generated ${optimizedCreneaux.length} optimized surveillance slots using fallback method`);
      
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
