
-- Ajouter la colonne faculte_interdite à la table surveillants (si pas déjà fait)
ALTER TABLE public.surveillants 
ADD COLUMN IF NOT EXISTS faculte_interdite TEXT;

-- Ajouter la colonne faculte à la table examens (si pas déjà fait)
ALTER TABLE public.examens 
ADD COLUMN IF NOT EXISTS faculte TEXT;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN public.surveillants.faculte_interdite IS 'Faculté pour laquelle le surveillant a un conflit d''intérêt (ex: étudiant de cette faculté)';
COMMENT ON COLUMN public.examens.faculte IS 'Faculté organisatrice de l''examen (FASB, EPL, FIAL, PSSP, etc.)';

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_surveillants_faculte_interdite ON public.surveillants(faculte_interdite) WHERE faculte_interdite IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_examens_faculte ON public.examens(faculte) WHERE faculte IS NOT NULL;

-- Ajouter une colonne pour la désactivation temporaire avec remarques
ALTER TABLE public.surveillant_sessions 
ADD COLUMN IF NOT EXISTS remarques_desactivation TEXT,
ADD COLUMN IF NOT EXISTS date_desactivation TIMESTAMP WITH TIME ZONE;

-- Commenter les nouvelles colonnes
COMMENT ON COLUMN public.surveillant_sessions.remarques_desactivation IS 'Raison de la mise à quota 0 (désactivation temporaire)';
COMMENT ON COLUMN public.surveillant_sessions.date_desactivation IS 'Date de désactivation temporaire du surveillant';
