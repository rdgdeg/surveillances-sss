
-- Update the disponibilites table RLS policies for better security

-- Remove existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Public can create availabilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can read his own disponibilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can update his own disponibilities" ON public.disponibilites;
DROP POLICY IF EXISTS "Surveillant can delete his own disponibilities" ON public.disponibilites;

-- Enable RLS if not already enabled
ALTER TABLE public.disponibilites ENABLE ROW LEVEL SECURITY;

-- Allow public insert for the availability form (controlled by application logic)
CREATE POLICY "Public can create availabilities"
  ON public.disponibilites
  FOR INSERT
  WITH CHECK (true);

-- Allow surveillants to read their own disponibilities (by email match)
CREATE POLICY "Surveillant can read his own disponibilities"
  ON public.disponibilites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    public.is_admin()
  );

-- Allow surveillants to update their own disponibilities
CREATE POLICY "Surveillant can update his own disponibilities"
  ON public.disponibilites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    public.is_admin()
  );

-- Allow surveillants to delete their own disponibilities
CREATE POLICY "Surveillant can delete his own disponibilities"
  ON public.disponibilites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
    OR
    public.is_admin()
  );

-- Admin access to all disponibilites
CREATE POLICY "Admin full access to disponibilites"
  ON public.disponibilites
  FOR ALL
  TO authenticated
  USING (public.is_admin());
