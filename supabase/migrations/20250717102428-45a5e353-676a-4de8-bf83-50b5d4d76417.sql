-- Mise à jour des liens Google Maps pour les auditoires du secteur SSS

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Avenue+Emmanuel+Mounier+51+1200+Bruxelles',
  adresse = 'Avenue Emmanuel Mounier, 51 - 1200 Bruxelles'
WHERE auditoire ILIKE '%central%' OR auditoire ILIKE '%lacroix%' OR auditoire = 'A' OR auditoire = 'B' OR auditoire = 'C' OR auditoire = 'E' OR auditoire = 'F' OR auditoire = 'G';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Avenue+Emmanuel+Mounier+71+1200+Bruxelles',
  adresse = 'Avenue Emmanuel Mounier, 71 - 1200 Bruxelles'
WHERE auditoire ILIKE '%simonart%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Avenue+Emmanuel+Mounier+1200+Bruxelles',
  adresse = 'Avenue Emmanuel Mounier - 1200 Bruxelles (Entrée F tour Rosalind Franklin)'
WHERE auditoire ILIKE '%roi baudouin%' OR auditoire ILIKE '%clinique%' OR auditoire ILIKE '%rb%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Clos+Chapelle-aux-Champs+19+1200+Bruxelles',
  adresse = 'Clos Chapelle-aux-Champs, 19 - 1200 Bruxelles'
WHERE auditoire ILIKE '%pavillon%' OR auditoire ILIKE '%conférence%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Passage+de+la+Vecqu%C3%A9e+17+1200+Bruxelles',
  adresse = 'Passage de la Vecquée, 17 – 1200 Bruxelles'
WHERE auditoire ILIKE '%vecquée%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Jardin+Martin+V+42+1200+Bruxelles',
  adresse = 'Jardin Martin V, 42 - 1200 Bruxelles'
WHERE auditoire ILIKE '%martin%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Tour+Pasteur+53+Avenue+Emmanuel+Mounier+1200+Bruxelles',
  adresse = 'Tour Pasteur 53, Avenue Emmanuel Mounier - 1200 Bruxelles'
WHERE auditoire ILIKE '%pasteur%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Tour+Harvey+55+Avenue+Hippocrate+1200+Bruxelles',
  adresse = 'Tour Harvey 55, Avenue Hippocrate – 1200 Bruxelles'
WHERE auditoire ILIKE '%harvey%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Tour+Ehrlich+72+Avenue+Emmanuel+Mounier+1200+Bruxelles',
  adresse = 'Tour Ehrlich 72, Avenue Emmanuel Mounier - 1200 Bruxelles'
WHERE auditoire ILIKE '%ehrlich%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/search/?api=1&query=Tour+ICP+74+Avenue+Hippocrate+1200+Bruxelles',
  adresse = 'Tour ICP 74, Avenue Hippocrate – 1200 Bruxelles'
WHERE auditoire ILIKE '%icp%';

UPDATE contraintes_auditoires SET 
  lien_google_maps = 'https://www.google.com/maps/dir/Avenue+Emmanuel+Mounier+51+1200+Bruxelles/109+rue+Neerveld+1200+Bruxelles',
  adresse = '109 rue Neerveld - 1200 Bruxelles'
WHERE auditoire ILIKE '%neerveld%';