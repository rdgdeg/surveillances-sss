
-- Créer une table pour les commentaires des surveillants
CREATE TABLE public.commentaires_disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  surveillant_id UUID,
  email TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'NON_LU',
  lu_par TEXT,
  lu_le TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter les contraintes
ALTER TABLE public.commentaires_disponibilites
ADD CONSTRAINT commentaires_disponibilites_statut_check 
CHECK (statut IN ('NON_LU', 'LU'));

-- Créer un index pour les requêtes fréquentes
CREATE INDEX idx_commentaires_disponibilites_session_statut 
ON public.commentaires_disponibilites(session_id, statut);

-- Activer RLS (optionnel, car c'est pour l'admin)
ALTER TABLE public.commentaires_disponibilites ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre l'insertion publique (pour le formulaire)
CREATE POLICY "Allow public insert" ON public.commentaires_disponibilites
FOR INSERT WITH CHECK (true);

-- Créer une politique pour la lecture (admin uniquement dans le futur)
CREATE POLICY "Allow read all" ON public.commentaires_disponibilites
FOR SELECT USING (true);

-- Créer une politique pour la mise à jour (admin uniquement dans le futur)
CREATE POLICY "Allow update all" ON public.commentaires_disponibilites
FOR UPDATE USING (true);
