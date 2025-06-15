
import { useContraintesAuditoires } from "./useContraintesAuditoires";

export function useExamenCalculations(selectedExamen: any) {
  // Fetch constraints for auditoires
  const { data: contraintesAuditoires } = useContraintesAuditoires();

  // Compute the required number of surveillants based on all auditoires in "salle" (comma-separated)
  const getTheoreticalSurveillants = () => {
    if (!selectedExamen?.salle || !contraintesAuditoires) return selectedExamen?.nombre_surveillants || 1;
    
    // Découper le champ salle sur les virgules et additionner les contraintes de chaque auditoire
    const auditoireList = selectedExamen.salle
      .split(",")
      .map((a: string) => a.trim().toLowerCase())
      .filter((a: string) => !!a);

    let total = 0;
    let fallback = 0;

    // Pour chaque auditoire, ajouter la contrainte (sinon fallback à nombre_surveillants global)
    auditoireList.forEach((auditoire: string) => {
      const individual = contraintesAuditoires[auditoire];
      if (individual !== undefined) {
        total += individual;
      } else {
        fallback += 1;
      }
    });

    // Si aucune contrainte trouvée, on utilise le nombre_surveillants (pour compatibilité)
    if (total === 0) {
      return selectedExamen.nombre_surveillants || 1;
    }
    // On additionne le fallback (pour les auditoires non trouvés dans la base)
    return total + fallback;
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
