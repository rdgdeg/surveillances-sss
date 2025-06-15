
-- Ajouter une contrainte d'unicité pour éviter la duplication d'examens selon session, code et date
ALTER TABLE public.examens
ADD CONSTRAINT unique_examen_code_date_per_session
  UNIQUE (session_id, code_examen, date_examen);
