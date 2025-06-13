
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDateBelgian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: fr });
};

export const formatDateTimeBelgian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: fr });
};

export const parseBelgianDate = (dateString: string): Date => {
  return parse(dateString, 'dd/MM/yyyy', new Date());
};

export const formatTimeRange = (heureDebut: string, heureFin: string): string => {
  return `${heureDebut} - ${heureFin}`;
};

// Convertit un numéro de série Excel en date
export const convertExcelSerialToDate = (serial: string | number): string | null => {
  const serialNumber = typeof serial === 'string' ? parseFloat(serial) : serial;
  
  // Vérifier si c'est un numéro de série Excel valide (entre 1 et 2958465)
  if (isNaN(serialNumber) || serialNumber < 1 || serialNumber > 2958465) {
    return null;
  }
  
  // Excel compte les jours depuis le 1er janvier 1900, mais avec un bug (1900 n'est pas une année bissextile)
  // On utilise le 30 décembre 1899 comme date de base pour corriger ce bug
  const excelEpoch = new Date(1899, 11, 30); // 30 décembre 1899
  const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
  
  // Retourner au format YYYY-MM-DD pour PostgreSQL
  return format(date, 'yyyy-MM-dd');
};

// Fonction pour parser différents formats de date avec correction pour les années à 2 chiffres
export const parseFlexibleDate = (dateValue: string | number): string | null => {
  if (!dateValue) return null;
  
  const dateString = String(dateValue).trim();
  
  // Si c'est un numéro (série Excel)
  if (/^\d+$/.test(dateString)) {
    return convertExcelSerialToDate(dateString);
  }
  
  // Si c'est déjà au format YYYY-MM-DD, vérifier l'année
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const year = parseInt(dateString.substring(0, 4));
    // Si l'année semble incorrecte (avant 2020 ou après 2030), essayer de la corriger
    if (year < 2020 || year > 2030) {
      console.warn('Date avec année suspecte détectée:', dateString);
      // Essayer de corriger en supposant que c'est une erreur de format
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [yearPart, month, day] = parts;
        // Si l'année est à 2 chiffres au début
        if (yearPart.length === 2) {
          const correctedYear = parseInt(yearPart) < 50 ? `20${yearPart}` : `19${yearPart}`;
          return `${correctedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    return dateString;
  }
  
  // Si c'est au format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    const yearNum = parseInt(year);
    // Vérifier si l'année semble correcte
    if (yearNum < 2020 || yearNum > 2030) {
      console.warn('Année suspecte dans la date:', dateString);
      // Essayer de corriger en supposant que c'est 2025
      return `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD/MM/YY (2 chiffres pour l'année)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    // Convertir l'année 2 chiffres en 4 chiffres (assumant 2020-2030 pour les examens)
    const fullYear = parseInt(year) < 30 ? `20${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    const yearNum = parseInt(year);
    if (yearNum < 2020 || yearNum > 2030) {
      console.warn('Année suspecte dans la date:', dateString);
      return `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD-MM-YY (2 chiffres pour l'année)
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    // Convertir l'année 2 chiffres en 4 chiffres (assumant 2020-2030)
    const fullYear = parseInt(year) < 30 ? `20${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Essayer de parser comme date normale
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Vérifier si l'année semble correcte (entre 2020 et 2030 pour les examens)
      const year = date.getFullYear();
      if (year < 2020 || year > 2030) {
        console.warn('Date année suspecte:', dateString, 'parsed as:', date);
        // Essayer de corriger en supposant que c'est 2025
        const correctedDate = new Date(2025, date.getMonth(), date.getDate());
        return format(correctedDate, 'yyyy-MM-dd');
      }
      return format(date, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.warn('Could not parse date:', dateString);
  }
  
  return null;
};
