
import { useContraintesAuditoiresMap } from "./useContraintesAuditoires";

export function useExamenCalculations(selectedExamen: any) {
  // Fetch constraints for auditoires
  const { data: contraintesMap } = useContraintesAuditoiresMap();

  // Compute the required number of surveillants based on all auditoires in "salle" (comma-separated)
  const getTheoreticalSurveillants = () => {
    if (!selectedExamen?.salle) return selectedExamen?.nombre_surveillants || 1;
    
    // Si pas de contraintes disponibles, utiliser le nombre_surveillants par défaut
    if (!contraintesMap) {
      console.log(`[DEBUG] No constraints available, using default: ${selectedExamen.nombre_surveillants || 1}`);
      return selectedExamen.nombre_surveillants || 1;
    }
    
    // Découper le champ salle sur les virgules et additionner les contraintes de chaque auditoire
    const auditoireList = selectedExamen.salle
      .split(",")
      .map((a: string) => a.trim())
      .filter((a: string) => !!a);

    let total = 0;
    let hasConstraints = false;

    console.log(`[DEBUG] Calculating theoretical surveillants for exam ${selectedExamen.code_examen}:`);
    console.log(`[DEBUG] Auditoires: ${auditoireList.join(', ')}`);

    // Pour chaque auditoire, ajouter la contrainte correspondante
    auditoireList.forEach((auditoire: string) => {
      // Normaliser le nom de l'auditoire pour la recherche
      const auditoireNormalized = auditoire.toLowerCase().trim();
      
      // Chercher une correspondance exacte ou partielle dans les contraintes
      let constraint = contraintesMap[auditoireNormalized];
      
      // Si pas trouvé, essayer des variations courantes
      if (!constraint) {
        const variations = [
          auditoireNormalized.replace(/\s+/g, ''), // Sans espaces
          auditoireNormalized.replace(/\s+/g, ' '), // Un seul espace
          auditoire.trim(), // Casse originale
          auditoire.trim().toLowerCase()
        ];
        
        for (const variation of variations) {
          if (contraintesMap[variation]) {
            constraint = contraintesMap[variation];
            break;
          }
        }
      }
      
      if (constraint !== undefined) {
        total += constraint;
        hasConstraints = true;
        console.log(`[DEBUG] Found constraint for ${auditoire}: ${constraint} surveillants`);
      } else {
        // Si aucune contrainte trouvée pour cet auditoire, utiliser 1 par défaut
        total += 1;
        console.log(`[DEBUG] No constraint found for ${auditoire}, using default: 1 surveillant`);
      }
    });

    console.log(`[DEBUG] Total theoretical surveillants: ${total}`);

    // Si aucune contrainte trouvée du tout, on utilise le nombre_surveillants (pour compatibilité)
    if (!hasConstraints && total === auditoireList.length) {
      console.log(`[DEBUG] No constraints found, falling back to nombre_surveillants: ${selectedExamen.nombre_surveillants || 1}`);
      return selectedExamen.nombre_surveillants || 1;
    }
    
    return total;
  };

  // Compute number of pedagogical team members that count towards quota (EXCLUANT l'enseignant présent)
  const calculerSurveillantsPedagogiques = () => {
    if (!selectedExamen?.personnes_aidantes) return 0;
    
    // Compter seulement les personnes aidantes qui ne sont pas des enseignants
    // et qui comptent dans le quota et sont présentes sur place
    const pedagogiques = selectedExamen.personnes_aidantes.filter((p: any) =>
      p.compte_dans_quota && 
      p.present_sur_place && 
      !p.est_enseignant // Exclure les enseignants pour éviter le double comptage
    ).length;
    
    console.log(`[DEBUG] Pedagogical team members counting towards quota (excluding teachers): ${pedagogiques}`);
    return pedagogiques;
  };

  // Compute number of surveillants still needed (real need) - LOGIQUE CORRIGÉE
  const calculerSurveillantsNecessaires = () => {
    const pedagogiques = calculerSurveillantsPedagogiques();
    const enseignantPresent = selectedExamen?.surveillants_enseignant || 0;
    const personnesAmenees = selectedExamen?.surveillants_amenes || 0;
    const preAssignes = selectedExamen?.surveillants_pre_assignes || 0;
    const theoriques = getTheoreticalSurveillants();
    
    // CORRECTION: Utiliser Math.max pour éviter le double comptage
    // Si l'enseignant est présent ET qu'il y a des pédagogiques, on prend le max des deux
    // car l'enseignant peut faire partie de l'équipe pédagogique
    const effectifPresent = Math.max(enseignantPresent, pedagogiques);
    
    // Total requis - effectif présent - amenés - pré-assignés, clamp à >=0
    const necessaires = Math.max(
      0,
      theoriques - effectifPresent - personnesAmenees - preAssignes
    );
    
    console.log(`[DEBUG] Calculating real need for exam ${selectedExamen.code_examen}:`);
    console.log(`[DEBUG] - Theoretical: ${theoriques}`);
    console.log(`[DEBUG] - Teacher present: ${enseignantPresent}`);
    console.log(`[DEBUG] - Pedagogical team (excluding teachers): ${pedagogiques}`);
    console.log(`[DEBUG] - Effective present (max of teacher and pedagogical): ${effectifPresent}`);
    console.log(`[DEBUG] - Brought people: ${personnesAmenees}`);
    console.log(`[DEBUG] - Pre-assigned: ${preAssignes}`);
    console.log(`[DEBUG] - Real need: ${necessaires}`);
    
    return necessaires;
  };

  return {
    getTheoreticalSurveillants,
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires,
  };
}
