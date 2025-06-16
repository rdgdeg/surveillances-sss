
-- Vérifier et corriger la contrainte sur les types de surveillants
-- D'abord, supprimer l'ancienne contrainte s'il y en a une
ALTER TABLE public.surveillants DROP CONSTRAINT IF EXISTS surveillants_type_check;

-- Créer une nouvelle contrainte qui inclut tous les types valides
ALTER TABLE public.surveillants ADD CONSTRAINT surveillants_type_check 
CHECK (type IN (
  'Personnel Académique',
  'Personnel Administratif', 
  'Jobiste',
  'Assistant',
  'Doctorant',
  'PAT',
  'PAT FASB',
  'Externe',
  'Autres'
));
