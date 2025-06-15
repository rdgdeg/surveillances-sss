
import { useContraintesAuditoires } from "./useContraintesAuditoires";

export function useExamenCalculations(selectedExamen: any) {
  // Fetch constraints for auditoires
  const { data: contraintesAuditoires } = useContraintesAuditoires();

  // Compute the required number of surveillants based on auditoire constraints
  const getTheoreticalSurveillants = () => {
    if (!selectedExamen?.salle || !contraintesAuditoires) return selectedExamen?.nombre_surveillants || 1;
    // Normalize to match DB storage (trim and lowercase)
    const auditoireKey = selectedExamen.salle.trim().toLowerCase();
    const constraint = contraintesAuditoires[auditoireKey];
    // If constraint found, use it; else fallback to nombre_surveillants
    return constraint ?? (selectedExamen.nombre_surveillants || 1);
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
    // Now: total - pedagogiques - prof - amènes (cannot be < 0)
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
  }
}
