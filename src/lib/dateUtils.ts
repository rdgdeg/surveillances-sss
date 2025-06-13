
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
  
  // Si c'est déjà au format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Si c'est au format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD/MM/YY (2 chiffres pour l'année)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    // Convertir l'année 2 chiffres en 4 chiffres (assumant 2000-2099)
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Si c'est au format DD-MM-YY (2 chiffres pour l'année)
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    // Convertir l'année 2 chiffres en 4 chiffres (assumant 2000-2099)
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Essayer de parser comme date normale
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Vérifier si l'année semble correcte (entre 2000 et 2100)
      const year = date.getFullYear();
      if (year < 2000 || year > 2100) {
        console.warn('Date année suspecte:', dateString, 'parsed as:', date);
        return null;
      }
      return format(date, 'yyyy-MM-dd');
    }
  } catch (error) {
    console.warn('Could not parse date:', dateString);
  }
  
  return null;
};
