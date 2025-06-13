
-- Ajouter la colonne faculte_interdite à la table surveillants
ALTER TABLE public.surveillants 
ADD COLUMN faculte_interdite TEXT;

-- Ajouter la colonne faculte à la table examens
ALTER TABLE public.examens 
ADD COLUMN faculte TEXT;

-- Ajouter la colonne auditoire_original à la table examens pour les examens multi-auditoires
ALTER TABLE public.examens 
ADD COLUMN auditoire_original TEXT;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN public.surveillants.faculte_interdite IS 'Faculté pour laquelle le surveillant a un conflit d''intérêt (ex: étudiant de cette faculté)';
COMMENT ON COLUMN public.examens.faculte IS 'Faculté organisatrice de l''examen (FASB, EPL, FIAL, PSSP, etc.)';
COMMENT ON COLUMN public.examens.auditoire_original IS 'Référence de l''auditoire original pour les examens répartis sur plusieurs salles';

-- Créer un index pour les performances sur faculte_interdite
CREATE INDEX idx_surveillants_faculte_interdite ON public.surveillants(faculte_interdite) WHERE faculte_interdite IS NOT NULL;

-- Créer un index pour les performances sur faculte
CREATE INDEX idx_examens_faculte ON public.examens(faculte) WHERE faculte IS NOT NULL;
