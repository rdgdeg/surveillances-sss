
-- Ajouter le champ is_active à la table examens
ALTER TABLE public.examens 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Mettre à jour le trigger pour calculer les surveillants à attribuer
-- en tenant compte du statut actif
CREATE OR REPLACE FUNCTION public.calculate_surveillants_a_attribuer()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Si l'examen est désactivé, mettre surveillants_a_attribuer à 0
  IF NEW.is_active = false THEN
    NEW.surveillants_a_attribuer := 0;
    RETURN NEW;
  END IF;
  
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
$function$;
