
-- Créer la table pour le verrouillage des fonctionnalités
CREATE TABLE public.feature_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux admins de tout voir et modifier
CREATE POLICY "Admins can manage feature locks" 
  ON public.feature_locks 
  FOR ALL 
  USING (public.is_admin());

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_feature_locks_updated_at
  BEFORE UPDATE ON public.feature_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les fonctionnalités principales identifiées
INSERT INTO public.feature_locks (feature_name, description, category) VALUES
  -- Calculs
  ('calcul_surveillants_theoriques', 'Calcul automatique du nombre de surveillants requis basé sur les contraintes d''auditoires', 'Calculs'),
  ('fusion_creneaux_surveillance', 'Fusion automatique des créneaux de surveillance qui se chevauchent', 'Calculs'),
  ('calcul_surveillants_necessaires', 'Calcul du nombre de surveillants encore nécessaires après déduction des enseignants et amenés', 'Calculs'),
  
  -- Import/Export
  ('import_examens_excel', 'Import des examens depuis des fichiers Excel', 'Import/Export'),
  ('export_disponibilites_excel', 'Export des disponibilités des surveillants vers Excel', 'Import/Export'),
  ('import_codes_automatique', 'Import automatique des codes d''examen avec classification', 'Import/Export'),
  ('validation_examens_workflow', 'Workflow de validation des examens importés', 'Import/Export'),
  
  -- Workflows
  ('confirmation_enseignants', 'Système de confirmation des examens par les enseignants', 'Workflows'),
  ('generation_tokens_enseignants', 'Génération et gestion des tokens d''accès pour les enseignants', 'Workflows'),
  ('workflow_validation_examens', 'Processus complet de validation des examens', 'Workflows'),
  
  -- Gestion Utilisateurs
  ('crud_surveillants', 'Création, modification et suppression des surveillants', 'Gestion Utilisateurs'),
  ('gestion_candidatures', 'Traitement des candidatures de surveillance', 'Gestion Utilisateurs'),
  ('gestion_disponibilites', 'Collecte et gestion des disponibilités', 'Gestion Utilisateurs'),
  ('modification_donnees_surveillants', 'Demandes de modification des données personnelles', 'Gestion Utilisateurs'),
  
  -- Planning
  ('attribution_surveillances', 'Attribution automatique et manuelle des surveillances', 'Planning'),
  ('matrice_disponibilites', 'Affichage matriciel des disponibilités', 'Planning'),
  ('pre_assignations', 'Système de pré-assignation des surveillants', 'Planning'),
  ('planning_global', 'Vue d''ensemble du planning de surveillance', 'Planning'),
  
  -- Configuration
  ('contraintes_auditoires', 'Configuration des contraintes par auditoire', 'Configuration'),
  ('gestion_sessions', 'Création et gestion des sessions d''examen', 'Configuration'),
  ('contraintes_salles', 'Configuration des contraintes spécifiques aux salles', 'Configuration'),
  
  -- Suivi & Historique
  ('suivi_confirmation_enseignants', 'Suivi des confirmations reçues des enseignants', 'Suivi & Historique'),
  ('historique_modifications', 'Log des modifications sensibles', 'Suivi & Historique'),
  ('dashboard_overview', 'Tableau de bord avec statistiques générales', 'Suivi & Historique');
