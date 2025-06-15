
export function useExamenCalculations(selectedExamen: any) {
  // Calcule le nombre de surveillants pédagogiques
  const calculerSurveillantsPedagogiques = () => {
    if (!selectedExamen?.personnes_aidantes) return 0;
    return selectedExamen.personnes_aidantes.filter((p: any) =>
      p.compte_dans_quota && p.present_sur_place
    ).length;
  };

  // Calcule le nombre de surveillants supplémentaires à attribuer
  const calculerSurveillantsNecessaires = () => {
    const pedagogiques = calculerSurveillantsPedagogiques();
    const enseignantPresent = selectedExamen?.enseignant_present ? 1 : 0;
    const personnesAmenees = selectedExamen?.personnes_amenees || 0;
    
    const necessaires = Math.max(0, 
      (selectedExamen?.nombre_surveillants || 0) - pedagogiques - enseignantPresent - personnesAmenees
    );
    return necessaires;
  };

  return {
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires,
  }
}
