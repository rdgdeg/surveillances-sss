
-- Créer la table disponibilites avec format matriciel
CREATE TABLE public.disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surveillant_id UUID NOT NULL REFERENCES public.surveillants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  date_examen DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  est_disponible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(surveillant_id, session_id, date_examen, heure_debut, heure_fin)
);

-- Index pour améliorer les performances
CREATE INDEX idx_disponibilites_surveillant_session ON public.disponibilites(surveillant_id, session_id);
CREATE INDEX idx_disponibilites_date_heure ON public.disponibilites(date_examen, heure_debut, heure_fin);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_disponibilites_updated_at 
  BEFORE UPDATE ON public.disponibilites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Améliorer la table examens en ajoutant un index sur les horaires
CREATE INDEX IF NOT EXISTS idx_examens_date_heure ON public.examens(date_examen, heure_debut, heure_fin);

-- Créer une vue pour faciliter les requêtes d'attribution
CREATE OR REPLACE VIEW public.surveillance_assignments_view AS
SELECT 
  e.id as examen_id,
  e.date_examen,
  e.heure_debut,
  e.heure_fin,
  e.matiere,
  e.salle,
  e.nombre_surveillants,
  e.type_requis,
  s.id as surveillant_id,
  s.nom,
  s.prenom,
  s.email,
  s.type as surveillant_type,
  s.statut,
  COALESCE(d.est_disponible, false) as est_disponible,
  ss.quota,
  ss.sessions_imposees,
  COALESCE(attr_count.count, 0) as attributions_actuelles
FROM public.examens e
CROSS JOIN public.surveillants s
LEFT JOIN public.disponibilites d ON (
  d.surveillant_id = s.id 
  AND d.session_id = e.session_id
  AND d.date_examen = e.date_examen
  AND d.heure_debut = e.heure_debut
  AND d.heure_fin = e.heure_fin
)
LEFT JOIN public.surveillant_sessions ss ON (
  ss.surveillant_id = s.id 
  AND ss.session_id = e.session_id
)
LEFT JOIN (
  SELECT 
    surveillant_id, 
    session_id, 
    COUNT(*) as count
  FROM public.attributions 
  GROUP BY surveillant_id, session_id
) attr_count ON (
  attr_count.surveillant_id = s.id 
  AND attr_count.session_id = e.session_id
)
WHERE s.statut = 'actif' AND ss.is_active = true;
