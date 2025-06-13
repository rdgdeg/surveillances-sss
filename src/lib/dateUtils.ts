
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDateBelgian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: fr });
};

export const formatDateWithDayBelgian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'EEEE dd MMMM yyyy', { locale: fr });
};

export const formatDateTimeBelgian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMMM yyyy HH:mm', { locale: fr });
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

// Fonction améliorée pour parser différents formats de date avec validation stricte
export const parseFlexibleDate = (dateValue: string | number): string | null => {
  if (!dateValue) return null;
  
  const dateString = String(dateValue).trim();
  
  // Si c'est un numéro (série Excel)
  if (/^\d+$/.test(dateString)) {
    const excelDate = convertExcelSerialToDate(dateString);
    if (excelDate) {
      console.log(`Date Excel convertie: ${dateString} -> ${excelDate}`);
      return excelDate;
    }
  }
  
  // Validation pour s'assurer que l'année est dans une plage raisonnable (2020-2030)
  const validateYear = (year: number): boolean => {
    return year >= 2020 && year <= 2030;
  };
  
  // Si c'est déjà au format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const year = parseInt(dateString.substring(0, 4));
    if (validateYear(year)) {
      console.log(`Date ISO valide: ${dateString}`);
      return dateString;
    } else {
      console.warn(`Année invalide dans la date ISO: ${dateString} (année: ${year})`);
      return null;
    }
  }
  
  // Si c'est au format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    const yearNum = parseInt(year);
    if (validateYear(yearNum)) {
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`Date DD/MM/YYYY convertie: ${dateString} -> ${formattedDate}`);
      return formattedDate;
    } else {
      console.warn(`Année invalide dans la date DD/MM/YYYY: ${dateString} (année: ${yearNum})`);
      return null;
    }
  }
  
  // Si c'est au format DD/MM/YY (2 chiffres pour l'année)
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    // Convertir l'année 2 chiffres en 4 chiffres (20-30 = 2020-2030, 00-19 = 2000-2019)
    const yearNum = parseInt(year);
    const fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;
    
    if (validateYear(fullYear)) {
      const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`Date DD/MM/YY convertie: ${dateString} -> ${formattedDate}`);
      return formattedDate;
    } else {
      console.warn(`Année calculée invalide pour DD/MM/YY: ${dateString} (année calculée: ${fullYear})`);
      return null;
    }
  }
  
  // Si c'est au format DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    const yearNum = parseInt(year);
    if (validateYear(yearNum)) {
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`Date DD-MM-YYYY convertie: ${dateString} -> ${formattedDate}`);
      return formattedDate;
    } else {
      console.warn(`Année invalide dans la date DD-MM-YYYY: ${dateString} (année: ${yearNum})`);
      return null;
    }
  }
  
  // Si c'est au format DD-MM-YY (2 chiffres pour l'année)
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-');
    const yearNum = parseInt(year);
    const fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;
    
    if (validateYear(fullYear)) {
      const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log(`Date DD-MM-YY convertie: ${dateString} -> ${formattedDate}`);
      return formattedDate;
    } else {
      console.warn(`Année calculée invalide pour DD-MM-YY: ${dateString} (année calculée: ${fullYear})`);
      return null;
    }
  }
  
  // Essayer de parser comme date normale avec validation supplémentaire
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (validateYear(year)) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        console.log(`Date générique convertie: ${dateString} -> ${formattedDate}`);
        return formattedDate;
      } else {
        console.warn(`Année invalide dans la date générique: ${dateString} (année: ${year})`);
        return null;
      }
    }
  } catch (error) {
    console.warn('Impossible de parser la date:', dateString, error);
  }
  
  console.warn(`Format de date non reconnu: ${dateString}`);
  return null;
};
