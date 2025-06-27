
import { useContraintesAuditoiresMap } from "./useContraintesAuditoires";

/**
 * Hook centralisé pour tous les calculs de surveillants
 * Suit toujours l'ordre : Théorique -> Enseignant -> Amenés -> Pré-assignés
 */
export function useCalculSurveillants() {
  const { data: contraintesMap } = useContraintesAuditoiresMap();

  /**
   * Calcule le nombre théorique de surveillants basé sur les contraintes d'auditoires
   */
  const calculerSurveillantsTheorique = (examen: any): number => {
    if (!examen?.salle) return examen?.nombre_surveillants || 1;
    
    // Si pas de contraintes disponibles, utiliser le nombre_surveillants par défaut
    if (!contraintesMap) {
      return examen.nombre_surveillants || 1;
    }
    
    // Découper le champ salle sur les virgules et additionner les contraintes de chaque auditoire
    const auditoireList = examen.salle
      .split(",")
      .map((a: string) => a.trim())
      .filter((a: string) => !!a);

    let total = 0;
    let hasConstraints = false;

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
      } else {
        // Si aucune contrainte trouvée pour cet auditoire, utiliser 1 par défaut
        total += 1;
      }
    });

    // Si aucune contrainte trouvée du tout, on utilise le nombre_surveillants (pour compatibilité)
    if (!hasConstraints && total === auditoireList.length) {
      return examen.nombre_surveillants || 1;
    }
    
    return total;
  };

  /**
   * Calcule le besoin réel de surveillants à attribuer
   * FORMULE STANDARDISÉE : Théorique - Enseignant - Amenés - Pré-assignés
   */
  const calculerSurveillantsNecessaires = (examen: any): number => {
    const theorique = calculerSurveillantsTheorique(examen);
    const enseignantPresent = examen?.surveillants_enseignant || 0;
    const personnesAmenees = examen?.surveillants_amenes || 0;
    const preAssignes = examen?.surveillants_pre_assignes || 0;
    
    // FORMULE STANDARDISÉE
    const necessaires = Math.max(
      0,
      theorique - enseignantPresent - personnesAmenees - preAssignes
    );
    
    return necessaires;
  };

  /**
   * Calcule le nombre de personnes pédagogiques (pour affichage)
   */
  const calculerSurveillantsPedagogiques = (examen: any): number => {
    if (!examen?.personnes_aidantes) return 0;
    
    // Compter seulement les personnes aidantes qui ne sont pas des enseignants
    // et qui comptent dans le quota et sont présentes sur place
    return examen.personnes_aidantes.filter((p: any) =>
      p.compte_dans_quota && 
      p.present_sur_place && 
      !p.est_enseignant // Exclure les enseignants pour éviter le double comptage
    ).length;
  };

  return {
    calculerSurveillantsTheorique,
    calculerSurveillantsNecessaires,
    calculerSurveillantsPedagogiques,
  };
}
