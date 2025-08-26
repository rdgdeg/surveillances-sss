-- Ajouter les feature locks pour les boutons de navigation principaux
INSERT INTO public.feature_locks (feature_name, description, category, is_locked) VALUES 
('acces_planning_general', 'Accès au planning général depuis la page d''accueil', 'Navigation', false),
('acces_enseignants', 'Accès à la section enseignants depuis la page d''accueil', 'Navigation', false),
('acces_surveillants', 'Accès à la section surveillants depuis la page d''accueil', 'Navigation', false),
('acces_administration', 'Accès à la section administration depuis la page d''accueil', 'Navigation', false);