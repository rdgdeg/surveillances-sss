
import { useContraintesAuditoiresMap } from "./useContraintesAuditoires";

export function useExamenCalculations(selectedExamen: any) {
  // Fetch constraints for auditoires
  const { data: contraintesMap } = useContraintesAuditoiresMap();

  // Compute the required number of surveillants based on all auditoires in "salle" (comma-separated)
  const getTheoreticalSurveillants = () => {
    if (!selectedExamen?.salle || !contraintesMap) return selectedExamen?.nombre_surveillants || 1;
    
    // Découper le champ salle sur les virgules et additionner les contraintes de chaque auditoire
    const auditoireList = selectedExamen.salle
      .split(",")
      .map((a: string) => a.trim())
      .filter((a: string) => !!a);

    let total = 0;
    let hasConstraints = false;

    // Pour chaque auditoire, ajouter la contrainte correspondante
    auditoireList.forEach((auditoire: string) => {
      // Normaliser le nom de l'auditoire pour la recherche (enlever espaces supplémentaires, normaliser casse)
      const auditoireNormalized = auditoire.toLowerCase().trim();
      
      // Chercher une correspondance exacte ou partielle dans les contraintes
      let constraint = contraintesMap[auditoireNormalized];
      
      // Si pas trouvé, essayer des variations courantes
      if (!constraint) {
        // Essayer avec des variations de format (ex: "51 B" vs "51B")
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
      } else {
        // Si aucune contrainte trouvée pour cet auditoire, utiliser 1 par défaut
        total += 1;
      }
    });

    // Si aucune contrainte trouvée du tout, on utilise le nombre_surveillants (pour compatibilité)
    if (!hasConstraints && total === auditoireList.length) {
      return selectedExamen.nombre_surveillants || 1;
    }
    
    return total;
  };

  // Compute number of pedagogical team members that count towards quota
  const calculerSurveillantsPedagogiques = () => {
    if (!selectedExamen?.personnes_aidantes) return 0;
    return selectedExamen.personnes_aidantes.filter((p: any) =>
      p.compte_dans_quota && p.present_sur_place
    ).length;
  };

  // Compute number of surveillants still needed
  const calculerSurveillantsNecessaires = () => {
    const pedagogiques = calculerSurveillantsPedagogiques();
    const enseignantPresent = selectedExamen?.surveillants_enseignant || 0;
    const personnesAmenees = selectedExamen?.surveillants_amenes || 0;
    const theoriques = getTheoreticalSurveillants();
    // total requis - pédagogiques - prof - amenés, clamp à >=0
    const necessaires = Math.max(
      0,
      theoriques - pedagogiques - enseignantPresent - personnesAmenees
    );
    return necessaires;
  };

  return {
    getTheoreticalSurveillants,
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires,
  };
}
