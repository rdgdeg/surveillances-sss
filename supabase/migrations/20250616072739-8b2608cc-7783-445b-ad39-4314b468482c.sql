
-- Corriger le trigger d'audit qui cause l'erreur
-- Le problème est que audit_sensitive_changes() essaie d'accéder à NEW.session_id sur la table surveillants
-- où ce champ n'existe pas. Il faut modifier la fonction pour gérer ce cas.

CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  session_id_value uuid;
BEGIN
  -- Essayer de récupérer session_id selon la table
  IF TG_TABLE_NAME = 'surveillants' THEN
    -- Pour la table surveillants, on récupère la session active
    SELECT id INTO session_id_value 
    FROM public.sessions 
    WHERE is_active = true 
    LIMIT 1;
  ELSE
    -- Pour les autres tables, utiliser le champ session_id s'il existe
    session_id_value := COALESCE(NEW.session_id, OLD.session_id);
  END IF;
  
  INSERT INTO public.modifications_log (
    session_id,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_info
  ) VALUES (
    session_id_value,
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
$function$;

-- S'assurer que les triggers utilisent cette fonction corrigée
-- (les triggers existants devraient automatiquement utiliser la nouvelle version)
