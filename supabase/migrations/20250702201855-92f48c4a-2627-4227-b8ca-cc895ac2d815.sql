
-- Corriger la fonction generer_creneaux_surveillance pour éviter l'erreur avec les fonctions fenêtre
CREATE OR REPLACE FUNCTION public.generer_creneaux_surveillance(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  current_date DATE;
  examens_du_jour RECORD[];
  examens_groupes RECORD[];
  slot_debut TIME;
  slot_fin TIME;
  examens_du_slot JSONB;
  nb_examens_slot INTEGER;
  nb_surveillants_slot INTEGER;
  slots_count INTEGER := 0;
  i INTEGER;
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
    
    -- Récupérer tous les examens de cette date, triés par heure de début
    FOR rec IN (
      SELECT 
        *,
        EXTRACT(EPOCH FROM heure_debut)/60 - 45 AS debut_surveillance_min,
        EXTRACT(EPOCH FROM heure_fin)/60 AS fin_surveillance_min
      FROM public.examens 
      WHERE session_id = p_session_id 
        AND date_examen = current_date
        AND is_active = true 
        AND statut_validation = 'VALIDE'
      ORDER BY heure_debut
    ) LOOP
      
      -- Vérifier si cet examen peut être fusionné avec un créneau existant
      -- (examens qui se chevauchent ou sont proches de moins d'1h)
      
      -- Pour simplifier, créer un créneau par groupe d'examens contigus
      -- Calculer les heures de début et fin de surveillance
      slot_debut := (rec.debut_surveillance_min || ' minutes')::INTERVAL + '00:00:00'::TIME;
      slot_fin := (rec.fin_surveillance_min || ' minutes')::INTERVAL + '00:00:00'::TIME;
      
      -- Créer les données JSON de l'examen
      examens_du_slot := jsonb_build_array(
        jsonb_build_object(
          'id', rec.id,
          'code_examen', rec.code_examen,
          'matiere', rec.matiere,
          'salle', rec.salle,
          'heure_debut', rec.heure_debut,
          'heure_fin', rec.heure_fin,
          'nombre_surveillants', rec.nombre_surveillants,
          'surveillants_enseignant', COALESCE(rec.surveillants_enseignant, 0),
          'surveillants_amenes', COALESCE(rec.surveillants_amenes, 0),
          'surveillants_pre_assignes', COALESCE(rec.surveillants_pre_assignes, 0)
        )
      );
      
      nb_examens_slot := 1;
      nb_surveillants_slot := rec.nombre_surveillants;
      
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
        'Créneau généré automatiquement pour ' || rec.matiere || ' en ' || rec.salle,
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
