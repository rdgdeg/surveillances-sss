
import { useCalculSurveillants } from "./useCalculSurveillants";

export function useExamenCalculations(selectedExamen: any) {
  const { 
    calculerSurveillantsTheorique,
    calculerSurveillantsNecessaires,
    calculerSurveillantsPedagogiques
  } = useCalculSurveillants();

  const getTheoreticalSurveillants = () => {
    return calculerSurveillantsTheorique(selectedExamen);
  };

  const calculerSurveillantsNecessaires_local = () => {
    return calculerSurveillantsNecessaires(selectedExamen);
  };

  const calculerSurveillantsPedagogiques_local = () => {
    return calculerSurveillantsPedagogiques(selectedExamen);
  };

  return {
    getTheoreticalSurveillants,
    calculerSurveillantsPedagogiques: calculerSurveillantsPedagogiques_local,
    calculerSurveillantsNecessaires: calculerSurveillantsNecessaires_local,
  };
}
