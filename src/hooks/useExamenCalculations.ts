
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
    const necessaires = Math.max(0, selectedExamen?.nombre_surveillants - pedagogiques);
    return necessaires;
  };

  return {
    calculerSurveillantsPedagogiques,
    calculerSurveillantsNecessaires,
  }
}
