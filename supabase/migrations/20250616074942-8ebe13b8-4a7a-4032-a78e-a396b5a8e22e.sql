
-- Créer une table pour les demandes de modification de disponibilités
CREATE TABLE public.demandes_modification_disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  traite_par TEXT,
  commentaire_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter RLS
ALTER TABLE public.demandes_modification_disponibilites ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion publique (formulaire anonyme)
CREATE POLICY "Anyone can create modification requests" 
  ON public.demandes_modification_disponibilites 
  FOR INSERT 
  WITH CHECK (true);

-- Politique pour permettre la lecture aux admins seulement
CREATE POLICY "Only admins can view modification requests" 
  ON public.demandes_modification_disponibilites 
  FOR SELECT 
  USING (is_admin());

-- Politique pour permettre la mise à jour aux admins seulement
CREATE POLICY "Only admins can update modification requests" 
  ON public.demandes_modification_disponibilites 
  FOR UPDATE 
  USING (is_admin());
