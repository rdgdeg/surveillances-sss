
-- Créer la table pour les contraintes d'auditoires avec les règles spécifiques
CREATE TABLE public.contraintes_auditoires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auditoire TEXT NOT NULL UNIQUE,
  nombre_surveillants_requis INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insérer les contraintes spécifiques mentionnées
INSERT INTO public.contraintes_auditoires (auditoire, nombre_surveillants_requis, description) VALUES
('51B', 2, 'Auditoire nécessitant 2 surveillants'),
('51C', 2, 'Auditoire nécessitant 2 surveillants'),
('51D', 2, 'Auditoire nécessitant 2 surveillants'),
('51E', 2, 'Auditoire nécessitant 2 surveillants'),
('51F', 2, 'Auditoire nécessitant 2 surveillants'),
('5AG', 2, 'Auditoire nécessitant 2 surveillants'),
('51A Lacroix', 3, 'Auditoire Lacroix nécessitant 3 surveillants'),
('Simonart', 5, 'Auditoire Simonart nécessitant 5 surveillants'),
('Simonart RDC', 3, 'Auditoire Simonart RDC nécessitant 3 surveillants'),
('Neerveld', 1, 'Auditoire Neerveld nécessitant 1 surveillant');

-- Ajouter des colonnes aux examens pour la gestion avancée des besoins
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS surveillants_enseignant INTEGER DEFAULT 0;
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS surveillants_amenes INTEGER DEFAULT 0;
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS surveillants_pre_assignes INTEGER DEFAULT 0;
ALTER TABLE public.examens ADD COLUMN IF NOT EXISTS surveillants_a_attribuer INTEGER;

-- Ajouter des colonnes aux surveillants pour les nouvelles informations
ALTER TABLE public.surveillants ADD COLUMN IF NOT EXISTS telephone TEXT;

-- Créer la table pour collecter les informations des surveillants potentiels via interface publique
CREATE TABLE public.candidats_surveillance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  statut TEXT NOT NULL CHECK (statut IN ('Assistant', 'Doctorant', 'PAT', 'PAT FASB', 'Jobiste', 'Autre')),
  statut_autre TEXT, -- Pour préciser quand statut = 'Autre'
  session_id UUID REFERENCES public.sessions(id),
  traite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table pour les disponibilités des candidats
CREATE TABLE public.candidats_disponibilites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidat_id UUID REFERENCES public.candidats_surveillance(id) ON DELETE CASCADE,
  examen_id UUID REFERENCES public.examens(id) ON DELETE CASCADE,
  est_disponible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidat_id, examen_id)
);

-- Créer une fonction pour calculer automatiquement les surveillants à attribuer
CREATE OR REPLACE FUNCTION public.calculate_surveillants_a_attribuer()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le nombre de surveillants requis selon l'auditoire
  NEW.surveillants_a_attribuer := COALESCE(
    (SELECT nombre_surveillants_requis FROM public.contraintes_auditoires WHERE auditoire = NEW.salle),
    NEW.nombre_surveillants
  ) - COALESCE(NEW.surveillants_enseignant, 0) 
    - COALESCE(NEW.surveillants_amenes, 0) 
    - COALESCE(NEW.surveillants_pre_assignes, 0);
  
  -- S'assurer que le nombre ne soit pas négatif
  IF NEW.surveillants_a_attribuer < 0 THEN
    NEW.surveillants_a_attribuer := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour calculer automatiquement les surveillants à attribuer
CREATE TRIGGER trigger_calculate_surveillants_a_attribuer
  BEFORE INSERT OR UPDATE ON public.examens
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_surveillants_a_attribuer();

-- Mettre à jour les examens existants pour calculer les surveillants à attribuer
UPDATE public.examens SET updated_at = now();

-- Créer des triggers pour updated_at
CREATE TRIGGER update_contraintes_auditoires_updated_at
  BEFORE UPDATE ON public.contraintes_auditoires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidats_surveillance_updated_at
  BEFORE UPDATE ON public.candidats_surveillance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
