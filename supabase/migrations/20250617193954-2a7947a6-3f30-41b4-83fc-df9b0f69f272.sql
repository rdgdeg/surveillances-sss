
-- Créer une table pour gérer les créneaux de surveillance configurables
CREATE TABLE public.creneaux_surveillance_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  heure_debut TIME WITHOUT TIME ZONE NOT NULL,
  heure_fin TIME WITHOUT TIME ZONE NOT NULL,
  nom_creneau TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_by TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE(session_id, heure_debut, heure_fin)
);

-- Ajouter un index pour optimiser les requêtes
CREATE INDEX idx_creneaux_surveillance_config_session ON public.creneaux_surveillance_config(session_id);
CREATE INDEX idx_creneaux_surveillance_config_active ON public.creneaux_surveillance_config(is_active, is_validated);

-- Activer RLS
ALTER TABLE public.creneaux_surveillance_config ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Lecture créneaux surveillance config" ON public.creneaux_surveillance_config
  FOR SELECT USING (true);

-- Politique pour permettre l'insertion/modification/suppression aux admins seulement
CREATE POLICY "Gestion créneaux surveillance config" ON public.creneaux_surveillance_config
  FOR ALL USING (public.is_admin());

-- Ajouter le trigger pour updated_at
CREATE TRIGGER update_creneaux_surveillance_config_updated_at
  BEFORE UPDATE ON public.creneaux_surveillance_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les créneaux actuels pour la session active (si elle existe)
INSERT INTO public.creneaux_surveillance_config (
  session_id, heure_debut, heure_fin, nom_creneau, description, is_active, is_validated, created_by
)
SELECT 
  s.id,
  c.debut::TIME,
  c.fin::TIME,
  CASE 
    WHEN c.debut = '08:00' AND c.fin = '10:30' THEN 'Matin Précoce'
    WHEN c.debut = '08:15' AND c.fin = '11:00' THEN 'Matin Standard'
    WHEN c.debut = '08:15' AND c.fin = '12:00' THEN 'Matin Étendu'
    WHEN c.debut = '08:30' AND c.fin = '11:30' THEN 'Matin TPs'
    WHEN c.debut = '12:15' AND c.fin = '15:00' THEN 'Après-midi Standard'
    WHEN c.debut = '12:15' AND c.fin = '16:00' THEN 'Après-midi Étendu'
    WHEN c.debut = '13:30' AND c.fin = '15:30' THEN 'Après-midi Court'
    WHEN c.debut = '15:15' AND c.fin = '18:00' THEN 'Soir Standard'
    WHEN c.debut = '15:45' AND c.fin = '18:30' THEN 'Soir Étendu'
    ELSE 'Créneau personnalisé'
  END,
  CASE 
    WHEN c.debut = '08:00' AND c.fin = '10:30' THEN 'Pour examens type WFARM1237=E'
    WHEN c.debut = '08:30' AND c.fin = '11:30' THEN 'Pour examens TPs (WFARM1324 TPs + WFARM1325 TPs=E)'
    WHEN c.debut = '12:15' AND c.fin = '16:00' THEN 'Pour examens longs après-midi'
    WHEN c.debut = '13:30' AND c.fin = '15:30' THEN 'Pour examens type WFARM1324=E'
    ELSE 'Créneau de surveillance standard'
  END,
  true,
  true, -- On valide automatiquement les créneaux existants
  'system'
FROM public.sessions s
CROSS JOIN (
  VALUES 
    ('08:00', '10:30'),
    ('08:15', '11:00'),
    ('08:15', '12:00'),
    ('08:30', '11:30'),
    ('12:15', '15:00'),
    ('12:15', '16:00'),
    ('13:30', '15:30'),
    ('15:15', '18:00'),
    ('15:45', '18:30')
) AS c(debut, fin)
WHERE s.is_active = true
ON CONFLICT (session_id, heure_debut, heure_fin) DO NOTHING;
