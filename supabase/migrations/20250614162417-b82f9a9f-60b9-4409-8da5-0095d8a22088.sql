
-- Suppression préalable des politiques existantes, s’il y en a
DROP POLICY IF EXISTS "Public can create availabilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can read his own disponibilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can update his own disponibilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can delete his own disponibilities" ON public.disponibilites;

-- INSERT ouvert à tous (public, formulaire)
CREATE POLICY "Public can create availabilities"
  ON public.disponibilites
  FOR INSERT
  WITH CHECK (true);

-- SELECT: accès uniquement pour le surveillant correspondant (email JWT = email table surveillants, via id) ou admin
CREATE POLICY "Surveillant can read his own disponibilities"
  ON public.disponibilites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- UPDATE
CREATE POLICY "Surveillant can update his own disponibilities"
  ON public.disponibilites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE
CREATE POLICY "Surveillant can delete his own disponibilities"
  ON public.disponibilites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
