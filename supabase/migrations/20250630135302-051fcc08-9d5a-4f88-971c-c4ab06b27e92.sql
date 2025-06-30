
-- Créer une table de liaison entre créneaux de surveillance et examens
CREATE TABLE public.creneaux_examens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creneau_id UUID NOT NULL REFERENCES public.creneaux_surveillance_config(id) ON DELETE CASCADE,
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creneau_id, examen_id)
);

-- Ajouter des index pour optimiser les requêtes
CREATE INDEX idx_creneaux_examens_creneau ON public.creneaux_examens(creneau_id);
CREATE INDEX idx_creneaux_examens_examen ON public.creneaux_examens(examen_id);

-- Activer RLS
ALTER TABLE public.creneaux_examens ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Lecture créneaux examens" ON public.creneaux_examens
  FOR SELECT USING (true);

-- Politique pour permettre la gestion aux admins seulement
CREATE POLICY "Gestion créneaux examens" ON public.creneaux_examens
  FOR ALL USING (public.is_admin());

-- Ajouter le trigger pour updated_at
CREATE TRIGGER update_creneaux_examens_updated_at
  BEFORE UPDATE ON public.creneaux_examens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
