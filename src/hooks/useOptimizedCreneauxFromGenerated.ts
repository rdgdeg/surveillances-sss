
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OptimizedCreneauFromGenerated {
  type: 'surveillance';
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_surveillance: string;
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

// Hook simplifié qui utilise directement creneaux_surveillance_config
export const useOptimizedCreneauxFromGenerated = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux-simplified', sessionId],
    queryFn: async (): Promise<OptimizedCreneauFromGenerated[]> => {
      if (!sessionId) return [];
      
      console.log('[useOptimizedCreneauxFromGenerated] Using simplified approach for session:', sessionId);
      
      // Récupérer les créneaux de surveillance validés
      const { data: creneauxConfig, error: creneauxError } = await supabase
        .from('creneaux_surveillance_config')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .eq('is_validated', true)
        .order('heure_debut');

      if (creneauxError) {
        console.error('[useOptimizedCreneauxFromGenerated] Error fetching creneaux config:', creneauxError);
        throw creneauxError;
      }

      console.log('[useOptimizedCreneauxFromGenerated] Found validated creneaux:', creneauxConfig?.length || 0);

      if (!creneauxConfig || creneauxConfig.length === 0) {
        console.log('[useOptimizedCreneauxFromGenerated] No validated creneaux found');
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
        console.error('[useOptimizedCreneauxFromGenerated] Error fetching examens:', examensError);
        throw examensError;
      }

      console.log('[useOptimizedCreneauxFromGenerated] Found examens:', examens?.length || 0);

      if (!examens || examens.length === 0) {
        return [];
      }

      const optimizedCreneaux: OptimizedCreneauFromGenerated[] = [];

      // Fonction utilitaire pour convertir l'heure en minutes
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      // Récupérer toutes les dates d'examens uniques
      const datesExamens = [...new Set(examens.map(e => e.date_examen))].sort();

      console.log('[useOptimizedCreneauxFromGenerated] Processing dates:', datesExamens);

      // Pour chaque date d'examen
      datesExamens.forEach(date => {
        const examensDate = examens.filter(e => e.date_examen === date);
        console.log(`[useOptimizedCreneauxFromGenerated] Processing date ${date} with ${examensDate.length} examens`);
        
        // Pour chaque créneau validé, vérifier s'il peut couvrir des examens de cette date
        creneauxConfig.forEach(creneauConfig => {
          const creneauDebutMin = toMinutes(creneauConfig.heure_debut);
          const creneauFinMin = toMinutes(creneauConfig.heure_fin);
          
          // Trouver tous les examens de cette date qui peuvent être couverts par ce créneau
          const examensCouverts = examensDate.filter(examen => {
            const examenDebutMin = toMinutes(examen.heure_debut);
            const examenFinMin = toMinutes(examen.heure_fin);
            
            // Le créneau doit pouvoir commencer 45min avant l'examen et couvrir jusqu'à la fin
            const debutSurveillanceNecessaire = examenDebutMin - 45;
            
            return creneauDebutMin <= debutSurveillanceNecessaire && creneauFinMin >= examenFinMin;
          });
          
          // Si ce créneau peut couvrir au moins un examen de cette date, l'ajouter
          if (examensCouverts.length > 0) {
            console.log(`[useOptimizedCreneauxFromGenerated] Creating slot for ${date} ${creneauConfig.heure_debut}-${creneauConfig.heure_fin} covering ${examensCouverts.length} examens`);
            
            optimizedCreneaux.push({
              type: 'surveillance',
              date_examen: date,
              heure_debut: creneauConfig.heure_debut,
              heure_fin: creneauConfig.heure_fin,
              heure_debut_surveillance: creneauConfig.heure_debut,
              examens: examensCouverts.map(examen => ({
                id: examen.id,
                code_examen: examen.code_examen || '',
                matiere: examen.matiere,
                salle: examen.salle,
                heure_debut: examen.heure_debut,
                heure_fin: examen.heure_fin,
                nombre_surveillants: examen.nombre_surveillants,
                surveillants_enseignant: examen.surveillants_enseignant || 0,
                surveillants_amenes: examen.surveillants_amenes || 0,
                surveillants_pre_assignes: examen.surveillants_pre_assignes || 0
              }))
            });
          }
        });
      });

      console.log(`[useOptimizedCreneauxFromGenerated] Generated ${optimizedCreneaux.length} surveillance slots from validated creneaux`);
      
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
