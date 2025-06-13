
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
