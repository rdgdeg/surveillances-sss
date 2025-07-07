
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

// Hook qui génère les créneaux directement à partir des examens réels
export const useOptimizedCreneauxFromGenerated = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['optimized-creneaux-from-exams', sessionId],
    queryFn: async (): Promise<OptimizedCreneauFromGenerated[]> => {
      if (!sessionId) return [];
      
      console.log('[useOptimizedCreneauxFromGenerated] Generating creneaux directly from exams for session:', sessionId);
      
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

      // Grouper les examens par date, heure de début et heure de fin
      const groupedExamens = examens.reduce((groups, examen) => {
        const key = `${examen.date_examen}_${examen.heure_debut}_${examen.heure_fin}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(examen);
        return groups;
      }, {} as Record<string, typeof examens>);

      console.log('[useOptimizedCreneauxFromGenerated] Grouped examens into', Object.keys(groupedExamens).length, 'time slots');

      // Pour chaque groupe d'examens, créer un créneau de surveillance
      Object.values(groupedExamens).forEach(groupeExamens => {
        if (groupeExamens.length === 0) return;
        
        const premierExamen = groupeExamens[0];
        
        // Calculer l'heure de début de surveillance (45 min avant l'examen)
        const [heures, minutes] = premierExamen.heure_debut.split(':').map(Number);
        const debutExamenMinutes = heures * 60 + minutes;
        const debutSurveillanceMinutes = debutExamenMinutes - 45;
        
        const heureDebutSurveillance = `${Math.floor(debutSurveillanceMinutes / 60).toString().padStart(2, '0')}:${(debutSurveillanceMinutes % 60).toString().padStart(2, '0')}`;
        
        console.log(`[useOptimizedCreneauxFromGenerated] Creating créneau for ${premierExamen.date_examen} ${heureDebutSurveillance}-${premierExamen.heure_fin} with ${groupeExamens.length} examens`);
        
        optimizedCreneaux.push({
          type: 'surveillance',
          date_examen: premierExamen.date_examen,
          heure_debut: heureDebutSurveillance,
          heure_fin: premierExamen.heure_fin,
          heure_debut_surveillance: heureDebutSurveillance,
          examens: groupeExamens.map(examen => ({
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
      });

      console.log(`[useOptimizedCreneauxFromGenerated] Generated ${optimizedCreneaux.length} surveillance slots from examens`);
      
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
