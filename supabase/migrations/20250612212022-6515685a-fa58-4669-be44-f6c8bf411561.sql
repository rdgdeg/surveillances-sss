
-- Ajouter une colonne pour marquer les pré-assignations comme obligatoires
ALTER TABLE public.attributions 
ADD COLUMN is_obligatoire BOOLEAN NOT NULL DEFAULT false;

-- Créer une table pour gérer les contraintes par salle
CREATE TABLE public.contraintes_salles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  salle TEXT NOT NULL,
  min_non_jobistes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, salle)
);

-- Ajouter RLS pour la table contraintes_salles
ALTER TABLE public.contraintes_salles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON public.contraintes_salles FOR ALL USING (true);

-- Créer un index pour les performances
CREATE INDEX idx_contraintes_salles_session ON public.contraintes_salles(session_id);

-- Ajouter des commentaires pour documenter
COMMENT ON COLUMN public.attributions.is_obligatoire IS 'Indique si cette attribution est une pré-assignation obligatoire qui ne peut pas être modifiée par le moteur automatique';
COMMENT ON TABLE public.contraintes_salles IS 'Définit les contraintes minimum par salle (ex: au moins 1 non-jobiste par auditoire)';
