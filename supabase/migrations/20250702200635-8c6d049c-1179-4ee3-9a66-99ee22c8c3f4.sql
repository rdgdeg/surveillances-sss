-- Créer la nouvelle table pour les créneaux générés et gérés
CREATE TABLE public.creneaux_surveillance_generated (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  date_surveillance DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  nom_creneau TEXT,
  description TEXT,
  examens_couverts JSONB NOT NULL DEFAULT '[]',
  nb_examens INTEGER NOT NULL DEFAULT 0,
  nb_surveillants_requis INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'GENERE' CHECK (statut IN ('GENERE', 'VALIDE', 'REJETE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_manual BOOLEAN NOT NULL DEFAULT false, -- Créé manuellement ou généré automatiquement
  genere_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valide_le TIMESTAMP WITH TIME ZONE,
  valide_par TEXT,
  notes_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_creneaux_surveillance_generated_session_date ON public.creneaux_surveillance_generated(session_id, date_surveillance);
CREATE INDEX idx_creneaux_surveillance_generated_statut ON public.creneaux_surveillance_generated(statut);

-- Enable RLS
ALTER TABLE public.creneaux_surveillance_generated ENABLE ROW LEVEL SECURITY;

-- Policies pour les admins
CREATE POLICY "Admins can manage creneaux_surveillance_generated" 
ON public.creneaux_surveillance_generated 
FOR ALL 
USING (is_admin());

-- Policy pour lecture publique des créneaux validés seulement
CREATE POLICY "Public can read validated creneaux" 
ON public.creneaux_surveillance_generated 
FOR SELECT 
USING (statut = 'VALIDE' AND is_active = true);

-- Trigger pour updated_at
CREATE TRIGGER update_creneaux_surveillance_generated_updated_at
BEFORE UPDATE ON public.creneaux_surveillance_generated
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer automatiquement les créneaux basés sur les examens
CREATE OR REPLACE FUNCTION public.generer_creneaux_surveillance(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  current_date DATE;
  current_slots RECORD;
  slot_debut TIME;
  slot_fin TIME;
  examens_du_slot JSONB;
  nb_examens_slot INTEGER;
  nb_surveillants_slot INTEGER;
  slots_count INTEGER := 0;
BEGIN
  -- Supprimer les créneaux générés automatiquement existants (garde les manuels)
  DELETE FROM public.creneaux_surveillance_generated 
  WHERE session_id = p_session_id AND is_manual = false;

  -- Pour chaque date d'examen
  FOR current_date IN (
    SELECT DISTINCT date_examen 
    FROM public.examens 
    WHERE session_id = p_session_id 
      AND is_active = true 
      AND statut_validation = 'VALIDE'
    ORDER BY date_examen
  ) LOOP
    
    -- Identifier les plages horaires d'examens pour cette date
    FOR current_slots IN (
      WITH examens_jour AS (
        SELECT *, 
               EXTRACT(EPOCH FROM heure_debut)/60 - 45 AS debut_surveillance_min,
               EXTRACT(EPOCH FROM heure_fin)/60 AS fin_surveillance_min
        FROM public.examens 
        WHERE session_id = p_session_id 
          AND date_examen = current_date
          AND is_active = true 
          AND statut_validation = 'VALIDE'
      ),
      plages AS (
        SELECT 
          MIN(debut_surveillance_min) AS debut_min,
          MAX(fin_surveillance_min) AS fin_max,
          COUNT(*) AS nb_examens,
          SUM(nombre_surveillants) AS nb_surveillants_total,
          jsonb_agg(jsonb_build_object(
            'id', id,
            'code_examen', code_examen,
            'matiere', matiere,
            'salle', salle,
            'heure_debut', heure_debut,
            'heure_fin', heure_fin,
            'nombre_surveillants', nombre_surveillants
          )) AS examens_data
        FROM examens_jour
        WHERE ABS(debut_surveillance_min - LAG(fin_surveillance_min, 1, debut_surveillance_min) OVER (ORDER BY debut_surveillance_min)) <= 60
      )
      SELECT 
        (debut_min || ' minutes')::INTERVAL + '00:00:00'::TIME AS heure_debut_calc,
        (fin_max || ' minutes')::INTERVAL + '00:00:00'::TIME AS heure_fin_calc,
        nb_examens,
        nb_surveillants_total,
        examens_data
      FROM plages
      WHERE nb_examens > 0
    ) LOOP
      
      slot_debut := current_slots.heure_debut_calc;
      slot_fin := current_slots.heure_fin_calc;
      examens_du_slot := current_slots.examens_data;
      nb_examens_slot := current_slots.nb_examens;
      nb_surveillants_slot := current_slots.nb_surveillants_total;
      
      -- Insérer le créneau généré
      INSERT INTO public.creneaux_surveillance_generated (
        session_id,
        date_surveillance,
        heure_debut,
        heure_fin,
        nom_creneau,
        description,
        examens_couverts,
        nb_examens,
        nb_surveillants_requis,
        statut,
        is_manual
      ) VALUES (
        p_session_id,
        current_date,
        slot_debut,
        slot_fin,
        'Créneau ' || TO_CHAR(slot_debut, 'HH24:MI') || '-' || TO_CHAR(slot_fin, 'HH24:MI'),
        'Créneau généré automatiquement pour ' || nb_examens_slot || ' examen(s)',
        examens_du_slot,
        nb_examens_slot,
        nb_surveillants_slot,
        'GENERE',
        false
      );
      
      slots_count := slots_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN slots_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;