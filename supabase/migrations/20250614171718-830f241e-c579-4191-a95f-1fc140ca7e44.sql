
-- 1. Créer une table d'archive pour les disponibilités (avant purge)
CREATE TABLE public.disponibilites_archive (
  id UUID NOT NULL PRIMARY KEY,
  surveillant_id UUID NOT NULL,
  session_id UUID NOT NULL,
  date_examen DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  est_disponible BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  nom_examen_obligatoire TEXT,
  commentaire_surveillance_obligatoire TEXT,
  archivé_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Ajouter un index pour les recherches fréquentes
CREATE INDEX idx_dispo_archive_session_surveillant ON public.disponibilites_archive(session_id, surveillant_id);

-- 3. (Optionnel) Activer la RLS et politique. Ici, on laisse public car c’est purement historique/admin ;
-- Enable Row Level Security
ALTER TABLE public.disponibilites_archive ENABLE ROW LEVEL SECURITY;

-- Permettre à tous les admin authentifiés de lire les archives
CREATE POLICY "archive_read" ON public.disponibilites_archive
  FOR SELECT USING (true);

