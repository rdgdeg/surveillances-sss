
import { useState, useCallback } from "react";

export interface SurveillantSensitiveData {
  eft: number | null;
  affectation_fac: string | null;
  date_fin_contrat: string | null;
  telephone_gsm: string | null;
  campus: string | null;
}

export const useSurveillantSensitiveData = () => {
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const isContractValid = useCallback((dateFinContrat: string | null): boolean => {
    if (!dateFinContrat) return true; // Pas de date = contrat permanent
    
    const today = new Date();
    const endDate = new Date(dateFinContrat);
    return endDate > today;
  }, []);

  const isContractExpiringSoon = useCallback((dateFinContrat: string | null, daysThreshold: number = 30): boolean => {
    if (!dateFinContrat) return false;
    
    const today = new Date();
    const endDate = new Date(dateFinContrat);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
  }, []);

  const calculateAdjustedQuota = useCallback((baseQuota: number, eft: number | null): number => {
    if (!eft || eft <= 0) return baseQuota;
    
    // Ajuster le quota selon l'EFT
    // EFT 0.5 = quota réduit de moitié, etc.
    const adjustedQuota = Math.round(baseQuota * eft);
    return Math.max(1, adjustedQuota); // Minimum 1 surveillance
  }, []);

  const isFSMSurveillant = useCallback((affectationFac: string | null): boolean => {
    if (!affectationFac) return false;
    
    // Vérifier si l'affectation est FSM (à exclure)
    return affectationFac.toUpperCase().includes('FSM');
  }, []);

  const shouldExcludeFromAssignment = useCallback((surveillant: {
    affectation_fac: string | null;
    date_fin_contrat: string | null;
    statut: string;
  }): { exclude: boolean; reason?: string } => {
    // Exclusion FSM
    if (isFSMSurveillant(surveillant.affectation_fac)) {
      return { exclude: true, reason: "Affectation FSM" };
    }

    // Exclusion contrat expiré
    if (!isContractValid(surveillant.date_fin_contrat)) {
      return { exclude: true, reason: "Contrat expiré" };
    }

    // Exclusion statut inactif
    if (surveillant.statut !== 'actif') {
      return { exclude: true, reason: "Statut inactif" };
    }

    return { exclude: false };
  }, [isFSMSurveillant, isContractValid]);

  const formatSensitiveDisplay = useCallback((value: any, type: 'eft' | 'date' | 'text'): string => {
    if (!showSensitiveData) return "••••••";
    
    if (!value) return "Non renseigné";
    
    switch (type) {
      case 'eft':
        return `${(value * 100).toFixed(0)}%`;
      case 'date':
        return new Date(value).toLocaleDateString('fr-FR');
      case 'text':
      default:
        return value.toString();
    }
  }, [showSensitiveData]);

  return {
    showSensitiveData,
    setShowSensitiveData,
    isContractValid,
    isContractExpiringSoon,
    calculateAdjustedQuota,
    isFSMSurveillant,
    shouldExcludeFromAssignment,
    formatSensitiveDisplay
  };
};
