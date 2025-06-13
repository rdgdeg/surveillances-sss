
-- Correction de la fonction create_test_data pour utiliser les bons statuts
CREATE OR REPLACE FUNCTION public.create_test_data(session_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  test_session_id UUID := session_id_param;
  surveillant_ids UUID[];
  examen_ids UUID[];
  current_surveillant_id UUID;
  current_examen_id UUID;
  i INTEGER;
BEGIN
  -- Créer des surveillants de test avec les vrais statuts et facultés interdites
  WITH inserted_surveillants AS (
    INSERT INTO public.surveillants (nom, prenom, email, type, statut, faculte_interdite)
    VALUES 
      ('Dupont', 'Jean', 'jean.dupont@test.com', 'PAT', 'actif', 'FASB'),
      ('Martin', 'Marie', 'marie.martin@test.com', 'Jobiste', 'actif', NULL),
      ('Bernard', 'Pierre', 'pierre.bernard@test.com', 'Assistant', 'actif', 'EPL'),
      ('Durand', 'Sophie', 'sophie.durand@test.com', 'Jobiste', 'actif', NULL),
      ('Leroy', 'Paul', 'paul.leroy@test.com', 'Doctorant', 'actif', 'FIAL'),
      ('Moreau', 'Claire', 'claire.moreau@test.com', 'PAT FASB', 'actif', NULL),
      ('Skalmowski', 'Constance', 'constance.skalmowski@student.uclouvain.be', 'Jobiste', 'actif', 'FASB')
    RETURNING id
  )
  SELECT array_agg(id) INTO surveillant_ids FROM inserted_surveillants;

  -- Marquer les surveillants comme données de test
  FOR i IN 1..array_length(surveillant_ids, 1) LOOP
    INSERT INTO public.test_data_markers (table_name, record_id, description)
    VALUES ('surveillants', surveillant_ids[i], 'Surveillant de test');
  END LOOP;

  -- Créer les liens surveillant-session avec quotas adaptés selon le type
  INSERT INTO public.surveillant_sessions (surveillant_id, session_id, quota, is_active)
  SELECT 
    s.id,
    test_session_id,
    CASE 
      WHEN s.type IN ('PAT', 'PAT FASB') THEN 12
      WHEN s.type IN ('Assistant', 'Doctorant') THEN 6
      WHEN s.type = 'Jobiste' THEN 4
      ELSE 6
    END as quota,
    true
  FROM public.surveillants s
  WHERE s.id = ANY(surveillant_ids);
  
  -- Marquer les liens comme données de test
  INSERT INTO public.test_data_markers (table_name, record_id, description)
  SELECT 'surveillant_sessions', ss.id, 'Lien surveillant-session de test'
  FROM public.surveillant_sessions ss 
  WHERE ss.surveillant_id = ANY(surveillant_ids) AND ss.session_id = test_session_id;

  -- Créer des examens de test avec facultés et auditoires multiples
  WITH inserted_examens AS (
    INSERT INTO public.examens (session_id, date_examen, heure_debut, heure_fin, matiere, salle, nombre_surveillants, type_requis, faculte, auditoire_original)
    VALUES 
      -- Examens FASB
      (test_session_id, CURRENT_DATE + INTERVAL '7 days', '08:30', '11:30', 'WRDTH3160 - Mathématiques financières', 'HALL01', 3, 'PAT', 'FASB', 'HALL01, HALL02'),
      (test_session_id, CURRENT_DATE + INTERVAL '7 days', '08:30', '11:30', 'WRDTH3160 - Mathématiques financières', 'HALL02', 2, 'PAT', 'FASB', 'HALL01, HALL02'),
      (test_session_id, CURRENT_DATE + INTERVAL '7 days', '13:30', '16:30', 'WMEDE1100 - Statistiques', 'HALL03', 2, 'Jobiste', 'FASB', NULL),
      
      -- Examens EPL
      (test_session_id, CURRENT_DATE + INTERVAL '8 days', '08:30', '11:30', 'LMECA2170 - Mécanique des fluides', 'HALL04', 4, 'Assistant', 'EPL', 'HALL04, HALL05, HALL06'),
      (test_session_id, CURRENT_DATE + INTERVAL '8 days', '08:30', '11:30', 'LMECA2170 - Mécanique des fluides', 'HALL05', 3, 'Assistant', 'EPL', 'HALL04, HALL05, HALL06'),
      (test_session_id, CURRENT_DATE + INTERVAL '8 days', '08:30', '11:30', 'LMECA2170 - Mécanique des fluides', 'HALL06', 2, 'Assistant', 'EPL', 'HALL04, HALL05, HALL06'),
      (test_session_id, CURRENT_DATE + INTERVAL '8 days', '13:30', '16:30', 'LELEC2885 - Électronique', 'HALL07', 2, 'Jobiste', 'EPL', NULL),
      
      -- Examens FIAL
      (test_session_id, CURRENT_DATE + INTERVAL '9 days', '08:30', '11:30', 'LROM2610 - Littérature française', 'HALL08', 3, 'Doctorant', 'FIAL', NULL),
      (test_session_id, CURRENT_DATE + INTERVAL '9 days', '13:30', '16:30', 'LANGL2431 - Anglais avancé', 'HALL09', 2, 'Jobiste', 'FIAL', NULL),
      
      -- Examens PSSP
      (test_session_id, CURRENT_DATE + INTERVAL '10 days', '08:30', '11:30', 'LPSP1001 - Psychologie générale', 'HALL10', 3, 'PAT FASB', 'PSSP', NULL),
      (test_session_id, CURRENT_DATE + INTERVAL '10 days', '13:30', '16:30', 'LSOC2440 - Sociologie politique', 'HALL11', 2, 'Jobiste', 'PSSP', NULL)
    RETURNING id
  )
  SELECT array_agg(id) INTO examen_ids FROM inserted_examens;

  -- Marquer les examens comme données de test
  FOR i IN 1..array_length(examen_ids, 1) LOOP
    INSERT INTO public.test_data_markers (table_name, record_id, description)
    VALUES ('examens', examen_ids[i], 'Examen de test');
  END LOOP;

  -- Créer des contraintes de salles pour les auditoires
  INSERT INTO public.contraintes_salles (session_id, salle, min_non_jobistes)
  VALUES 
    (test_session_id, 'HALL01', 2),
    (test_session_id, 'HALL02', 1),
    (test_session_id, 'HALL03', 1),
    (test_session_id, 'HALL04', 2),
    (test_session_id, 'HALL05', 2),
    (test_session_id, 'HALL06', 1),
    (test_session_id, 'HALL07', 1),
    (test_session_id, 'HALL08', 2),
    (test_session_id, 'HALL09', 1),
    (test_session_id, 'HALL10', 2),
    (test_session_id, 'HALL11', 1);

  -- Marquer les contraintes comme données de test
  INSERT INTO public.test_data_markers (table_name, record_id, description)
  SELECT 'contraintes_salles', id, 'Contrainte de salle de test'
  FROM public.contraintes_salles 
  WHERE session_id = test_session_id;

  -- Créer des disponibilités de test (matrice croisée)
  FOREACH current_surveillant_id IN ARRAY surveillant_ids LOOP
    FOREACH current_examen_id IN ARRAY examen_ids LOOP
      INSERT INTO public.disponibilites (
        surveillant_id, 
        session_id, 
        date_examen, 
        heure_debut, 
        heure_fin, 
        est_disponible
      )
      SELECT 
        current_surveillant_id,
        test_session_id,
        e.date_examen,
        e.heure_debut,
        e.heure_fin,
        (random() > 0.3) -- 70% de chance d'être disponible
      FROM public.examens e 
      WHERE e.id = current_examen_id;

      INSERT INTO public.test_data_markers (table_name, record_id, description)
      VALUES ('disponibilites', 
              (SELECT id FROM public.disponibilites 
               WHERE surveillant_id = current_surveillant_id 
               AND session_id = test_session_id 
               AND date_examen = (SELECT date_examen FROM public.examens WHERE id = current_examen_id)
               AND heure_debut = (SELECT heure_debut FROM public.examens WHERE id = current_examen_id)
               LIMIT 1),
              'Disponibilité de test');
    END LOOP;
  END LOOP;

  RETURN 'Données de test créées avec succès pour la session ' || test_session_id || '. Inclut des examens multi-auditoires et des contraintes de faculté avec les bons statuts.';
END;
$$ LANGUAGE plpgsql;
