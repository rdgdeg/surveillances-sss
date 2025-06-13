
-- Créer la table pour la validation des examens
CREATE TABLE public.examens_validation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  code_original TEXT NOT NULL,
  type_detecte TEXT, -- E, O, E+O, INCONNU
  statut_validation TEXT NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut_validation IN ('EN_ATTENTE', 'VALIDE', 'REJETE', 'NECESSITE_VALIDATION')),
  commentaire TEXT,
  valide_par TEXT,
  date_validation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table pour les personnes aidantes
CREATE TABLE public.personnes_aidantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  est_assistant BOOLEAN NOT NULL DEFAULT false,
  compte_dans_quota BOOLEAN NOT NULL DEFAULT true,
  present_sur_place BOOLEAN NOT NULL DEFAULT true,
  ajoute_par TEXT, -- nom de la personne qui a ajouté
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table pour les créneaux de surveillance générés automatiquement
CREATE TABLE public.creneaux_surveillance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examen_id UUID NOT NULL REFERENCES public.examens(id) ON DELETE CASCADE,
  date_surveillance DATE NOT NULL,
  heure_debut_surveillance TIME NOT NULL,
  heure_fin_surveillance TIME NOT NULL,
  type_creneau TEXT NOT NULL DEFAULT 'PRINCIPAL', -- PRINCIPAL, PREPARATION_LONGUE
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter des colonnes à la table examens existante
ALTER TABLE public.examens 
ADD COLUMN code_examen TEXT,
ADD COLUMN statut_validation TEXT DEFAULT 'NON_TRAITE' CHECK (statut_validation IN ('NON_TRAITE', 'EN_COURS', 'VALIDE', 'REJETE')),
ADD COLUMN lien_enseignant_token TEXT UNIQUE,
ADD COLUMN enseignant_email TEXT,
ADD COLUMN enseignant_nom TEXT,
ADD COLUMN besoins_confirmes_par_enseignant BOOLEAN DEFAULT false,
ADD COLUMN date_confirmation_enseignant TIMESTAMP WITH TIME ZONE;

-- Créer des index pour améliorer les performances
CREATE INDEX idx_examens_validation_examen_id ON public.examens_validation(examen_id);
CREATE INDEX idx_examens_validation_statut ON public.examens_validation(statut_validation);
CREATE INDEX idx_personnes_aidantes_examen_id ON public.personnes_aidantes(examen_id);
CREATE INDEX idx_creneaux_surveillance_examen_id ON public.creneaux_surveillance(examen_id);
CREATE INDEX idx_examens_code ON public.examens(code_examen) WHERE code_examen IS NOT NULL;
CREATE INDEX idx_examens_token ON public.examens(lien_enseignant_token) WHERE lien_enseignant_token IS NOT NULL;

-- Créer des triggers pour mettre à jour updated_at
CREATE TRIGGER update_examens_validation_updated_at
  BEFORE UPDATE ON public.examens_validation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personnes_aidantes_updated_at
  BEFORE UPDATE ON public.personnes_aidantes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer un token unique pour les enseignants
CREATE OR REPLACE FUNCTION public.generate_teacher_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour parser et classifier automatiquement les codes d'examens
CREATE OR REPLACE FUNCTION public.classifier_code_examen(code_original TEXT)
RETURNS TABLE (
  type_detecte TEXT,
  statut_validation TEXT,
  commentaire TEXT
) AS $$
BEGIN
  -- Nettoyer le code (supprimer espaces en début/fin)
  code_original := TRIM(code_original);
  
  -- Cas 1: Code se terminant par =E (examen écrit)
  IF code_original ~ '.*=E$' THEN
    RETURN QUERY SELECT 'E'::TEXT, 'VALIDE'::TEXT, 'Examen écrit détecté automatiquement'::TEXT;
    RETURN;
  END IF;
  
  -- Cas 2: Code se terminant par =O (examen oral)
  IF code_original ~ '.*=O$' THEN
    RETURN QUERY SELECT 'O'::TEXT, 'REJETE'::TEXT, 'Examen oral - attribution non nécessaire'::TEXT;
    RETURN;
  END IF;
  
  -- Cas 3: Code contenant =E+ (examen mixte)
  IF code_original ~ '.*=E\+.*' THEN
    RETURN QUERY SELECT 'E+O'::TEXT, 'NECESSITE_VALIDATION'::TEXT, 'Examen mixte détecté - validation manuelle requise'::TEXT;
    RETURN;
  END IF;
  
  -- Cas 4: Code contenant =E suivi de texte
  IF code_original ~ '.*=E.+' THEN
    RETURN QUERY SELECT 'E_AVEC_TEXTE'::TEXT, 'NECESSITE_VALIDATION'::TEXT, 'Code examen écrit avec texte supplémentaire - vérification nécessaire'::TEXT;
    RETURN;
  END IF;
  
  -- Cas 5: Autres cas nécessitant une validation manuelle
  RETURN QUERY SELECT 'INCONNU'::TEXT, 'NECESSITE_VALIDATION'::TEXT, 'Format de code non reconnu - validation manuelle requise'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer automatiquement les créneaux de surveillance
CREATE OR REPLACE FUNCTION public.calculer_creneaux_surveillance(
  p_examen_id UUID,
  p_date_examen DATE,
  p_heure_debut TIME,
  p_heure_fin TIME
) RETURNS VOID AS $$
DECLARE
  heure_debut_surveillance TIME;
BEGIN
  -- Supprimer les créneaux existants pour cet examen
  DELETE FROM public.creneaux_surveillance WHERE examen_id = p_examen_id;
  
  -- Calculer l'heure de début de surveillance (45 minutes avant)
  heure_debut_surveillance := p_heure_debut - INTERVAL '45 minutes';
  
  -- Insérer le créneau principal
  INSERT INTO public.creneaux_surveillance (
    examen_id,
    date_surveillance,
    heure_debut_surveillance,
    heure_fin_surveillance,
    type_creneau
  ) VALUES (
    p_examen_id,
    p_date_examen,
    heure_debut_surveillance,
    p_heure_fin,
    'PRINCIPAL'
  );
  
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les créneaux quand un examen est inséré/modifié
CREATE OR REPLACE FUNCTION public.trigger_calculer_creneaux_surveillance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculer_creneaux_surveillance(
    NEW.id,
    NEW.date_examen,
    NEW.heure_debut,
    NEW.heure_fin
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_examens_calculer_creneaux
  AFTER INSERT OR UPDATE OF date_examen, heure_debut, heure_fin
  ON public.examens
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculer_creneaux_surveillance();

-- Ajouter des politiques RLS
ALTER TABLE public.examens_validation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnes_aidantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creneaux_surveillance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.examens_validation FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.personnes_aidantes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.creneaux_surveillance FOR ALL USING (true);

-- Commentaires pour documenter les nouvelles tables
COMMENT ON TABLE public.examens_validation IS 'Table pour gérer la validation des codes d''examens et leur classification automatique';
COMMENT ON TABLE public.personnes_aidantes IS 'Table pour stocker les personnes qui viennent aider aux examens (enseignants, assistants, etc.)';
COMMENT ON TABLE public.creneaux_surveillance IS 'Table pour les créneaux de surveillance générés automatiquement avec préparation de 45 minutes';

COMMENT ON COLUMN public.examens.code_examen IS 'Code original de l''examen (ex: WDENT2152=E)';
COMMENT ON COLUMN public.examens.lien_enseignant_token IS 'Token unique pour permettre à l''enseignant d''accéder au formulaire de confirmation';
COMMENT ON COLUMN public.examens.besoins_confirmes_par_enseignant IS 'Indique si l''enseignant a confirmé les besoins en surveillants';
