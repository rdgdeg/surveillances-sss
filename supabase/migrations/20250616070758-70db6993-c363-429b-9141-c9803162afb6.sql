
-- Phase 1: Critical RLS Policy Implementation

-- 1. Enable RLS on unprotected tables
ALTER TABLE public.surveillants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveillant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats_surveillance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats_disponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens_import_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examens_validation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnes_aidantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creneaux_surveillance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraintes_salles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifications_log ENABLE ROW LEVEL SECURITY;

-- 2. Remove overly permissive policies
DROP POLICY IF EXISTS "Allow all operations" ON public.surveillants;
DROP POLICY IF EXISTS "Allow all operations" ON public.surveillant_sessions;
DROP POLICY IF EXISTS "Allow all operations" ON public.examens;
DROP POLICY IF EXISTS "Allow all operations" ON public.sessions;
DROP POLICY IF EXISTS "Allow all operations" ON public.candidats_surveillance;
DROP POLICY IF EXISTS "Allow all operations" ON public.candidats_disponibilites;
DROP POLICY IF EXISTS "Allow all operations" ON public.examens_import_temp;
DROP POLICY IF EXISTS "Allow all operations" ON public.examens_validation;
DROP POLICY IF EXISTS "Allow all operations" ON public.personnes_aidantes;
DROP POLICY IF EXISTS "Allow all operations" ON public.creneaux_surveillance;
DROP POLICY IF EXISTS "Allow all operations" ON public.contraintes_salles;
DROP POLICY IF EXISTS "Allow all operations" ON public.indisponibilites;
DROP POLICY IF EXISTS "Allow all operations" ON public.modifications_log;

-- 3. Create security definer function for admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. Create security definer function for surveillant email check
CREATE OR REPLACE FUNCTION public.is_surveillant_email(email_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveillants 
    WHERE email = email_to_check
  );
$$;

-- 5. Implement restrictive RLS policies

-- SURVEILLANTS: Admin-only access + self-access for reading
CREATE POLICY "Admin full access to surveillants"
  ON public.surveillants
  FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Surveillants can read their own data"
  ON public.surveillants
  FOR SELECT
  TO authenticated
  USING (
    email = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'email'),
      ''
    )
  );

-- SURVEILLANT_SESSIONS: Admin-only
CREATE POLICY "Admin full access to surveillant_sessions"
  ON public.surveillant_sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- EXAMENS: Read access for public forms (limited), admin for modifications
CREATE POLICY "Public read access to active examens"
  ON public.examens
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin full access to examens"
  ON public.examens
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- SESSIONS: Read access for active session, admin for management
CREATE POLICY "Public read access to active sessions"
  ON public.sessions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin full access to sessions"
  ON public.sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- CANDIDATS_SURVEILLANCE: Restricted access
CREATE POLICY "Admin access to candidats_surveillance"
  ON public.candidats_surveillance
  FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Public insert for candidats_surveillance"
  ON public.candidats_surveillance
  FOR INSERT
  WITH CHECK (true);

-- CANDIDATS_DISPONIBILITES: Restricted access
CREATE POLICY "Admin access to candidats_disponibilites"
  ON public.candidats_disponibilites
  FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Public insert for candidats_disponibilites"
  ON public.candidats_disponibilites
  FOR INSERT
  WITH CHECK (true);

-- EXAMENS_IMPORT_TEMP: Admin-only
CREATE POLICY "Admin access to examens_import_temp"
  ON public.examens_import_temp
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- EXAMENS_VALIDATION: Admin-only
CREATE POLICY "Admin access to examens_validation"
  ON public.examens_validation
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- PERSONNES_AIDANTES: Admin-only
CREATE POLICY "Admin access to personnes_aidantes"
  ON public.personnes_aidantes
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- CRENEAUX_SURVEILLANCE: Read access for public, admin for modifications
CREATE POLICY "Public read access to creneaux_surveillance"
  ON public.creneaux_surveillance
  FOR SELECT
  USING (true);

CREATE POLICY "Admin full access to creneaux_surveillance"
  ON public.creneaux_surveillance
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- CONTRAINTES_SALLES: Admin-only
CREATE POLICY "Admin access to contraintes_salles"
  ON public.contraintes_salles
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- INDISPONIBILITES: Admin + surveillant self-access
CREATE POLICY "Admin access to indisponibilites"
  ON public.indisponibilites
  FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Surveillants can manage their own indisponibilites"
  ON public.indisponibilites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.surveillants s
      WHERE s.id = surveillant_id
        AND s.email = COALESCE(
          (current_setting('request.jwt.claims', true)::json->>'email'),
          ''
        )
    )
  );

-- MODIFICATIONS_LOG: Admin read-only
CREATE POLICY "Admin read access to modifications_log"
  ON public.modifications_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 6. Add token expiration and security enhancements
ALTER TABLE public.examens 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMP WITH TIME ZONE;

-- Update existing tokens to expire in 48 hours
UPDATE public.examens 
SET token_expires_at = created_at + INTERVAL '48 hours'
WHERE lien_enseignant_token IS NOT NULL AND token_expires_at IS NULL;

-- 7. Create function to validate tokens
CREATE OR REPLACE FUNCTION public.is_valid_token(token_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.examens 
    WHERE lien_enseignant_token = token_to_check
      AND (token_expires_at IS NULL OR token_expires_at > now())
  );
$$;

-- 8. Add database constraints for security
ALTER TABLE public.surveillants 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 9. Add audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.modifications_log (
    session_id,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_info
  ) VALUES (
    COALESCE(NEW.session_id, OLD.session_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'email'),
      'system'
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_surveillants_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.surveillants
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

CREATE TRIGGER audit_examens_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.examens
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();
