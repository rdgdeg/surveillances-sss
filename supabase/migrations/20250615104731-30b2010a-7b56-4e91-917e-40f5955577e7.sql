
-- Ajouter les colonnes 'enseignants', 'etudiants' et 'duree' à la table examens
ALTER TABLE public.examens
  ADD COLUMN enseignants TEXT NULL,
  ADD COLUMN etudiants TEXT NULL,
  ADD COLUMN duree NUMERIC(4,2) NULL;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN public.examens.enseignants IS 'Liste d’enseignants liée à l’examen (saisie libre depuis Excel)';
COMMENT ON COLUMN public.examens.etudiants IS 'Liste ou effectif des étudiants depuis Excel';
COMMENT ON COLUMN public.examens.duree IS 'Durée de l’examen (en heures, nombre à virgule)';
