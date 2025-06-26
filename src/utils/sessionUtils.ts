
/**
 * Formate une session du format "2025_09" vers "Septembre 2025"
 */
export function formatSession(sessionCode: string): string {
  if (!sessionCode || !sessionCode.includes('_')) {
    return sessionCode;
  }

  const [year, month] = sessionCode.split('_');
  
  const monthNames = {
    '01': 'Janvier',
    '02': 'Février', 
    '03': 'Mars',
    '04': 'Avril',
    '05': 'Mai',
    '06': 'Juin',
    '07': 'Juillet',
    '08': 'Août',
    '09': 'Septembre',
    '10': 'Octobre',
    '11': 'Novembre',
    '12': 'Décembre'
  };

  const monthName = monthNames[month as keyof typeof monthNames];
  
  if (!monthName) {
    return sessionCode;
  }

  return `${monthName} ${year}`;
}

/**
 * Formate une session pour l'affichage court (ex: "Sept. 2025")
 */
export function formatSessionShort(sessionCode: string): string {
  if (!sessionCode || !sessionCode.includes('_')) {
    return sessionCode;
  }

  const [year, month] = sessionCode.split('_');
  
  const monthNamesShort = {
    '01': 'Jan.',
    '02': 'Fév.', 
    '03': 'Mars',
    '04': 'Avr.',
    '05': 'Mai',
    '06': 'Juin',
    '07': 'Juil.',
    '08': 'Août',
    '09': 'Sept.',
    '10': 'Oct.',
    '11': 'Nov.',
    '12': 'Déc.'
  };

  const monthName = monthNamesShort[month as keyof typeof monthNamesShort];
  
  if (!monthName) {
    return sessionCode;
  }

  return `${monthName} ${year}`;
}
