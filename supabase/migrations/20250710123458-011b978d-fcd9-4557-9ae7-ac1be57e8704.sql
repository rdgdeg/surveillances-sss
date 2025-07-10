-- Fix security issues: Clean up orphaned RLS policies and fix SECURITY DEFINER view

-- 1. Drop orphaned RLS policies on contraintes_auditoires (RLS is disabled on this table)
DROP POLICY IF EXISTS "Admins can manage contraintes_auditoires" ON public.contraintes_auditoires;

-- 2. Drop orphaned RLS policies on surveillant_sessions (RLS is disabled on this table)
DROP POLICY IF EXISTS "Admin full access to surveillant_sessions" ON public.surveillant_sessions;
DROP POLICY IF EXISTS "Admins can manage surveillant_sessions" ON public.surveillant_sessions;

-- 3. Recreate surveillance_assignments_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.surveillance_assignments_view;

CREATE VIEW public.surveillance_assignments_view AS
SELECT 
  s.id as surveillant_id,
  e.id as examen_id,
  s.nom,
  s.prenom,
  s.email,
  s.statut,
  s.type as surveillant_type,
  e.matiere,
  e.date_examen,
  e.heure_debut,
  e.heure_fin,
  e.salle,
  e.nombre_surveillants,
  e.type_requis,
  ss.quota,
  ss.sessions_imposees,
  COALESCE(
    (SELECT COUNT(*) 
     FROM attributions a 
     WHERE a.surveillant_id = s.id 
       AND a.session_id = e.session_id), 0
  ) as attributions_actuelles,
  CASE 
    WHEN d.est_disponible IS NOT NULL THEN d.est_disponible
    ELSE false
  END as est_disponible
FROM surveillants s
CROSS JOIN examens e
LEFT JOIN surveillant_sessions ss ON ss.surveillant_id = s.id AND ss.session_id = e.session_id
LEFT JOIN disponibilites d ON d.surveillant_id = s.id 
  AND d.session_id = e.session_id
  AND d.date_examen = e.date_examen
  AND d.heure_debut = (e.heure_debut - INTERVAL '45 minutes')::time
  AND d.heure_fin = e.heure_fin
WHERE ss.is_active = true
  AND e.is_active = true;