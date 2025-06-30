
-- Ajouter une politique RLS permettant aux utilisateurs de créer leur propre enregistrement surveillant_sessions
-- basé sur la correspondance email surveillant/utilisateur

-- D'abord, créer une fonction sécurisée pour vérifier si un utilisateur peut gérer un surveillant
CREATE OR REPLACE FUNCTION public.can_manage_surveillant(surveillant_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = surveillant_email
  );
$$;

-- Ajouter une politique permettant l'insertion dans surveillant_sessions
-- si l'utilisateur connecté correspond au surveillant via l'email
DROP POLICY IF EXISTS "Users can insert their own surveillant sessions" ON public.surveillant_sessions;
CREATE POLICY "Users can insert their own surveillant sessions"
ON public.surveillant_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.surveillants s
    WHERE s.id = surveillant_id
    AND public.can_manage_surveillant(s.email)
  )
);

-- Politique pour la sélection (lecture)
DROP POLICY IF EXISTS "Users can view their own surveillant sessions" ON public.surveillant_sessions;
CREATE POLICY "Users can view their own surveillant sessions"
ON public.surveillant_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveillants s
    WHERE s.id = surveillant_id
    AND public.can_manage_surveillant(s.email)
  )
);

-- Politique pour la mise à jour
DROP POLICY IF EXISTS "Users can update their own surveillant sessions" ON public.surveillant_sessions;
CREATE POLICY "Users can update their own surveillant sessions"
ON public.surveillant_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveillants s
    WHERE s.id = surveillant_id
    AND public.can_manage_surveillant(s.email)
  )
);
