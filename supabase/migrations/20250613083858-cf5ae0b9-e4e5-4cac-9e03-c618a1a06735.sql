
-- Ajouter les nouvelles colonnes sensibles à la table surveillants
ALTER TABLE public.surveillants 
ADD COLUMN eft DECIMAL(3,2) CHECK (eft >= 0 AND eft <= 1),
ADD COLUMN affectation_fac TEXT,
ADD COLUMN date_fin_contrat DATE,
ADD COLUMN telephone_gsm TEXT,
ADD COLUMN campus TEXT;

-- Ajouter des commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN public.surveillants.eft IS 'Équivalent Temps Plein (0.0 à 1.0) - données sensibles admin uniquement';
COMMENT ON COLUMN public.surveillants.affectation_fac IS 'Faculté d''affectation du surveillant - données sensibles admin uniquement';
COMMENT ON COLUMN public.surveillants.date_fin_contrat IS 'Date de fin de contrat - données sensibles admin uniquement';
COMMENT ON COLUMN public.surveillants.telephone_gsm IS 'Numéro de téléphone GSM collecté via formulaires - données sensibles admin uniquement';
COMMENT ON COLUMN public.surveillants.campus IS 'Campus d''affectation (Louvain-la-Neuve, Woluwe, etc.) - données sensibles admin uniquement';

-- Créer des index pour optimiser les requêtes
CREATE INDEX idx_surveillants_affectation_fac ON public.surveillants(affectation_fac) WHERE affectation_fac IS NOT NULL;
CREATE INDEX idx_surveillants_eft ON public.surveillants(eft) WHERE eft IS NOT NULL;
CREATE INDEX idx_surveillants_campus ON public.surveillants(campus) WHERE campus IS NOT NULL;
CREATE INDEX idx_surveillants_date_fin_contrat ON public.surveillants(date_fin_contrat) WHERE date_fin_contrat IS NOT NULL;
