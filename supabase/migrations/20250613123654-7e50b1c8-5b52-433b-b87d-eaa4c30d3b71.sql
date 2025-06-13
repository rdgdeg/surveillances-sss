
-- Vérifier la contrainte actuelle sur statut_validation
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.examens'::regclass 
AND conname LIKE '%statut_validation%';

-- Voir les valeurs actuelles qui posent problème
SELECT DISTINCT statut_validation, COUNT(*) 
FROM public.examens 
GROUP BY statut_validation;
