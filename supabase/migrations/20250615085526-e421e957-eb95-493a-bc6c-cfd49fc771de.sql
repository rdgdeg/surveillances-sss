
-- 1. Fonction utilitaire pour vérifier et fusionner les créneaux qui se chevauchent
CREATE OR REPLACE FUNCTION public.fusionner_creneaux_surveillance(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  overlapped RECORD;
  merged boolean := false;
BEGIN
  -- Boucle sur les créneaux triés par date/début/fin
  FOR rec IN
    SELECT *
    FROM creneaux_surveillance
    WHERE EXISTS (
      SELECT 1 FROM examens WHERE id = creneaux_surveillance.examen_id AND session_id = p_session_id
    )
    ORDER BY date_surveillance, heure_debut_surveillance, heure_fin_surveillance
  LOOP
    -- Cherche un créneau qui englobe ce créneau (date/heure) autre, même session
    SELECT * INTO overlapped
    FROM creneaux_surveillance c2
    WHERE
      c2.id <> rec.id
      AND c2.date_surveillance = rec.date_surveillance
      AND c2.heure_debut_surveillance <= rec.heure_debut_surveillance
      AND c2.heure_fin_surveillance >= rec.heure_fin_surveillance
      AND EXISTS (
        SELECT 1 FROM examens WHERE id = c2.examen_id AND session_id = p_session_id
      )
    LIMIT 1;

    IF found THEN
      -- Supprime le créneau englobé (rec), on conserve le plus long
      DELETE FROM creneaux_surveillance WHERE id = rec.id;
      merged := true;
    END IF;
  END LOOP;
END;
$$;

-- 2. Modifie trigger de validation examen : après validation, créé les créneaux puis lance fusion automatique
CREATE OR REPLACE FUNCTION public.apres_validation_examens()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- On veut uniquement lancer pour la validation
  IF NEW.statut_validation = 'VALIDE' AND OLD.statut_validation <> 'VALIDE' THEN
    -- Créer/MAJ le créneau de cet examen
    PERFORM public.calculer_creneaux_surveillance(
      NEW.id,
      NEW.date_examen,
      NEW.heure_debut,
      NEW.heure_fin
    );
    -- Fusionner tous les créneaux de la session
    PERFORM public.fusionner_creneaux_surveillance(NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attacher ce trigger à la table examens (AFTER UPDATE sur statut_validation)
DROP TRIGGER IF EXISTS t_apres_validation_examens ON examens;
CREATE TRIGGER t_apres_validation_examens
AFTER UPDATE ON examens
FOR EACH ROW
EXECUTE FUNCTION public.apres_validation_examens();

-- 4. Demandes de modification info/quota (optionnel: si besoin, ajoute une colonne 'type_modif')
ALTER TABLE demandes_modification_info
ADD COLUMN IF NOT EXISTS type_modif text;

-- 5. (Vérifier) Clé unique sur (date_surveillance, heure_debut_surveillance, heure_fin_surveillance, session_id) pour éviter doublons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='creneaux_surveillance'
    AND indexname='unique_creneau_session'
  ) THEN
    CREATE UNIQUE INDEX unique_creneau_session
    ON creneaux_surveillance (date_surveillance, heure_debut_surveillance, heure_fin_surveillance, examen_id);
  END IF;
END$$;
