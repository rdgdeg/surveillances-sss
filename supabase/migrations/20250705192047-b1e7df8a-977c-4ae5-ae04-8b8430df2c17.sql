
-- Étape 1: Supprimer la table complexe creneaux_surveillance_generated qui n'est plus nécessaire
DROP TABLE IF EXISTS public.creneaux_surveillance_generated CASCADE;

-- Étape 2: Supprimer la fonction complexe de génération
DROP FUNCTION IF EXISTS public.generer_creneaux_surveillance(uuid);

-- Étape 3: Simplifier la table creneaux_surveillance_config en supprimant les champs inutiles
ALTER TABLE public.creneaux_surveillance_config 
DROP COLUMN IF EXISTS validated_by,
DROP COLUMN IF EXISTS validated_at;

-- Étape 4: Ajouter un champ simple pour marquer les créneaux comme standards ou personnalisés
ALTER TABLE public.creneaux_surveillance_config 
ADD COLUMN IF NOT EXISTS type_creneau TEXT DEFAULT 'manuel' CHECK (type_creneau IN ('standard', 'manuel', 'etendu'));

-- Étape 5: Créer une fonction simple pour générer des créneaux standards basés sur les examens
CREATE OR REPLACE FUNCTION public.generer_creneaux_standards(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  exam_record RECORD;
  creneau_count INTEGER := 0;
  heure_debut_surveillance TIME;
  type_creneau_value TEXT;
BEGIN
  -- Supprimer les anciens créneaux standards générés automatiquement
  DELETE FROM public.creneaux_surveillance_config 
  WHERE session_id = p_session_id AND type_creneau = 'standard';
  
  -- Pour chaque examen validé, créer un créneau standard
  FOR exam_record IN (
    SELECT DISTINCT 
      date_examen,
      heure_debut,
      heure_fin,
      COUNT(*) as nb_examens
    FROM public.examens 
    WHERE session_id = p_session_id 
      AND is_active = true 
      AND statut_validation = 'VALIDE'
    GROUP BY date_examen, heure_debut, heure_fin
    ORDER BY date_examen, heure_debut
  ) LOOP
    
    -- Calculer l'heure de début de surveillance (45 min avant)
    heure_debut_surveillance := exam_record.heure_debut - INTERVAL '45 minutes';
    
    -- Déterminer le type de créneau
    IF EXTRACT(EPOCH FROM (exam_record.heure_fin - exam_record.heure_debut))/3600 > 3 THEN
      type_creneau_value := 'etendu';
    ELSE
      type_creneau_value := 'standard';
    END IF;
    
    -- Insérer le créneau standard
    INSERT INTO public.creneaux_surveillance_config (
      session_id,
      heure_debut,
      heure_fin,
      nom_creneau,
      description,
      is_active,
      is_validated,
      type_creneau,
      created_by
    ) VALUES (
      p_session_id,
      heure_debut_surveillance,
      exam_record.heure_fin,
      'Créneau ' || TO_CHAR(heure_debut_surveillance, 'HH24:MI') || '-' || TO_CHAR(exam_record.heure_fin, 'HH24:MI'),
      'Créneau standard généré automatiquement (' || exam_record.nb_examens || ' examen(s))',
      true,
      false, -- Les créneaux générés doivent être validés manuellement
      type_creneau_value,
      'system'
    );
    
    creneau_count := creneau_count + 1;
  END LOOP;
  
  RETURN creneau_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
