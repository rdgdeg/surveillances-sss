
-- Supprimer les politiques RLS sur surveillant_sessions qui nécessitent une authentification
DROP POLICY IF EXISTS "Users can insert their own surveillant sessions" ON public.surveillant_sessions;
DROP POLICY IF EXISTS "Users can view their own surveillant sessions" ON public.surveillant_sessions;
DROP POLICY IF EXISTS "Users can update their own surveillant sessions" ON public.surveillant_sessions;

-- Désactiver RLS sur la table surveillant_sessions pour permettre l'accès public
ALTER TABLE public.surveillant_sessions DISABLE ROW LEVEL SECURITY;

-- Supprimer également la fonction qui n'est plus nécessaire
DROP FUNCTION IF EXISTS public.can_manage_surveillant(text);
