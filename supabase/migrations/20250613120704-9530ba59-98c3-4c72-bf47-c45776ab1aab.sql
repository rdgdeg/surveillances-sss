
-- Insérer tous les auditoires uniques détectés dans votre liste
INSERT INTO public.contraintes_auditoires (auditoire, nombre_surveillants_requis, description) VALUES
('74 ICP 4', 1, 'Créé automatiquement depuis la liste fournie'),
('51 A - Lacroix', 1, 'Créé automatiquement depuis la liste fournie'),
('51 C', 1, 'Créé automatiquement depuis la liste fournie'),
('51 B', 1, 'Créé automatiquement depuis la liste fournie'),
('51 F', 1, 'Créé automatiquement depuis la liste fournie'),
('55 Harvey 2', 1, 'Créé automatiquement depuis la liste fournie'),
('38 Salle B-C', 1, 'Créé automatiquement depuis la liste fournie'),
('38 Salle D', 1, 'Créé automatiquement depuis la liste fournie'),
('51 G', 1, 'Créé automatiquement depuis la liste fournie'),
('71 - Simonart', 1, 'Créé automatiquement depuis la liste fournie'),
('74 ICP 2', 1, 'Créé automatiquement depuis la liste fournie'),
('Neerveld A', 1, 'Créé automatiquement depuis la liste fournie'),
('Neerveld B', 1, 'Créé automatiquement depuis la liste fournie'),
('74 ICP 1', 1, 'Créé automatiquement depuis la liste fournie'),
('55 Harvey 3', 1, 'Créé automatiquement depuis la liste fournie'),
('55 Harvey 1', 1, 'Créé automatiquement depuis la liste fournie'),
('38 Salle E', 1, 'Créé automatiquement depuis la liste fournie'),
('10 A', 1, 'Créé automatiquement depuis la liste fournie'),
('10 B', 1, 'Créé automatiquement depuis la liste fournie'),
('74 FARM2 (99 6538)', 1, 'Créé automatiquement depuis la liste fournie'),
('10 C', 1, 'Créé automatiquement depuis la liste fournie'),
('74 ICP 3', 1, 'Créé automatiquement depuis la liste fournie'),
('72 Salle Galien A', 1, 'Créé automatiquement depuis la liste fournie'),
('72 Salle Galien B', 1, 'Créé automatiquement depuis la liste fournie'),
('73 Salle Couvreur (00 6140)', 1, 'Créé automatiquement depuis la liste fournie'),
('ESP A.358', 1, 'Créé automatiquement depuis la liste fournie'),
('73 Salle des Promotions', 1, 'Créé automatiquement depuis la liste fournie'),
('51 Salle TP Bio', 1, 'Créé automatiquement depuis la liste fournie'),
('L2', 1, 'Créé automatiquement depuis la liste fournie'),
('EMDS Labo de préclinique', 1, 'Créé automatiquement depuis la liste fournie'),
('Salle de séminaire Neerveld +5', 1, 'Créé automatiquement depuis la liste fournie'),
('74 FARM1 (99 6838)', 1, 'Créé automatiquement depuis la liste fournie'),
('38 Salle F', 1, 'Créé automatiquement depuis la liste fournie'),
('ESP Salle John Snow', 1, 'Créé automatiquement depuis la liste fournie'),
('38 Salle A', 1, 'Créé automatiquement depuis la liste fournie'),
('Hall 38 Pavillon', 1, 'Créé automatiquement depuis la liste fournie'),
('72 Salle Galien B', 1, 'Créé automatiquement depuis la liste fournie'),
('10A', 1, 'Créé automatiquement depuis la liste fournie'),
('10 Séminaire clinique 1', 1, 'Créé automatiquement depuis la liste fournie')
ON CONFLICT (auditoire) DO NOTHING;
