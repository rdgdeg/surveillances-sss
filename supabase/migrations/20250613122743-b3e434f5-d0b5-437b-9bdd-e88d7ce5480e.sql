
-- Désactiver la sécurité au niveau des lignes (RLS) pour la table contraintes_auditoires
-- Cette table contient des données partagées, pas des données utilisateur
ALTER TABLE public.contraintes_auditoires DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques RLS existantes si il y en a
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contraintes_auditoires;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.contraintes_auditoires;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.contraintes_auditoires;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.contraintes_auditoires;
