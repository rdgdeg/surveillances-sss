
-- 1. Ajouter un champ pour “surveillances à déduire” dans surveillants/candidats_surveillance
ALTER TABLE public.surveillants
  ADD COLUMN IF NOT EXISTS surveillances_a_deduire INTEGER DEFAULT 0;

ALTER TABLE public.candidats_surveillance
  ADD COLUMN IF NOT EXISTS surveillances_a_deduire INTEGER DEFAULT 0;

-- 2. Ajouter champs “type_choix” et “nom_examen_selectionne” dans disponibilites
ALTER TABLE public.disponibilites
  ADD COLUMN IF NOT EXISTS type_choix TEXT DEFAULT 'souhaitee', -- valeurs: 'souhaitee', 'obligatoire'
  ADD COLUMN IF NOT EXISTS nom_examen_selectionne TEXT;

-- 3. S'assurer que cela ne casse pas de données (les defaults évitent les erreurs)
