
-- 1. Ajouter un champ pour activer/désactiver le planning général
ALTER TABLE sessions ADD COLUMN planning_general_visible BOOLEAN DEFAULT false;

-- 2. Ajouter un champ pour indiquer si un surveillant a des obligations ou non
ALTER TABLE surveillant_sessions ADD COLUMN a_obligations BOOLEAN DEFAULT true;
