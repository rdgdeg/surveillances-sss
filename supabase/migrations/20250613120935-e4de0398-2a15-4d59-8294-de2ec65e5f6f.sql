
-- Ajouter les nouveaux auditoires Simonart et ajouter une colonne pour l'adresse/Google Maps
INSERT INTO public.contraintes_auditoires (auditoire, nombre_surveillants_requis, description) VALUES
('Simonart', 1, 'Créé automatiquement depuis la liste fournie'),
('Simonart bas', 1, 'Créé automatiquement depuis la liste fournie'),
('Simonart + 1/2 balcon', 1, 'Créé automatiquement depuis la liste fournie')
ON CONFLICT (auditoire) DO NOTHING;

-- Ajouter une colonne pour l'adresse et le lien Google Maps
ALTER TABLE public.contraintes_auditoires 
ADD COLUMN IF NOT EXISTS adresse TEXT,
ADD COLUMN IF NOT EXISTS lien_google_maps TEXT;
