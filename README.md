
# Système de Gestion des Surveillances - UCLouvain

## Vue d'ensemble

Le Système de Gestion des Surveillances de l'UCLouvain est une application web complète développée pour automatiser et optimiser la gestion des surveillances d'examens dans le secteur des Sciences de la Santé. L'application couvre l'ensemble du workflow, depuis l'import des examens jusqu'à l'attribution finale des surveillants.

## Architecture Technique

### Stack Technologique
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Build Tool**: Vite

### Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base (shadcn/ui)
│   ├── forms/          # Formulaires spécialisés
│   └── managers/       # Gestionnaires de fonctionnalités
├── hooks/              # Hooks personnalisés
├── pages/              # Pages principales de l'application
├── lib/                # Utilitaires et helpers
├── integrations/       # Intégrations externes (Supabase)
└── utils/              # Fonctions utilitaires
```

## Fonctionnalités Principales

### 1. Gestion des Sessions
- **Création/Activation** : Gestion des sessions académiques (Janvier, Juin, Septembre)
- **Composants** : `SessionSelector`, `DashboardOverview`
- **Base de données** : Table `sessions`

### 2. Import et Validation des Examens

#### 2.1 Import Excel
- **Fonctionnalité** : Import massif depuis fichiers Excel
- **Composants** : `ExcelFileUploader`, `ExamensImportTable`
- **Workflow** :
  1. Upload fichier Excel
  2. Parsing et validation des données
  3. Stockage temporaire (`examens_import_temp`)
  4. Révision et correction
  5. Validation finale vers `examens`

#### 2.2 Classification Automatique
- **Fonction SQL** : `classifier_code_examen()`
- **Types détectés** :
  - `=E` : Examen écrit (auto-validé)
  - `=O` : Examen oral (rejeté automatiquement)
  - `=E+` : Examen mixte (validation manuelle)
  - Autres : Validation manuelle requise

#### 2.3 Validation Workflow
- **Composants** : `ExamenReviewManager`, `ExamenValidationProcessor`
- **Statuts** : `NON_TRAITE`, `VALIDE`, `REJETE`, `NECESSITE_VALIDATION`

### 3. Gestion des Surveillants

#### 3.1 CRUD Surveillants
- **Composant** : `SurveillantUnifiedManager`
- **Types** : Personnel UCL, Jobistes, Externes
- **Données** : Informations personnelles, ETP, affectations

#### 3.2 Gestion des Sessions Surveillants
- **Table** : `surveillant_sessions`
- **Quotas** : Configuration par session et par surveillant
- **Statut** : Actif/Inactif par session

### 4. Collecte des Disponibilités

#### 4.1 Interface Surveillants
- **Composant** : `SimpleSurveillantAvailabilityForm`
- **Fonctionnalités** :
  - Saisie des disponibilités par créneau
  - Gestion des indisponibilités
  - Commentaires et préférences

#### 4.2 Interface Admin
- **Composants** : `DisponibilitesManager`, `AvailabilityMatrix`
- **Vues** :
  - Matrice globale des disponibilités
  - Suivi du taux de réponse
  - Gestion des candidatures

### 5. Workflow Enseignants

#### 5.1 Génération de Tokens
- **Composant** : `TokenGenerator`
- **Sécurité** : Tokens uniques avec expiration
- **Fonction** : `generate_teacher_token()`

#### 5.2 Confirmation des Examens
- **Composant** : `EnseignantExamenForm`
- **Processus** :
  1. Accès via token sécurisé
  2. Confirmation des détails d'examen
  3. Ajout d'assistants/équipe pédagogique
  4. Validation finale

### 6. Calculs et Attributions

#### 6.1 Calcul des Surveillants Requis
- **Hook** : `useExamenCalculations`
- **Logique** :
  - Base : Contraintes par auditoire
  - Déductions : Enseignants présents, assistants, pré-assignés
  - Sortie : Nombre de surveillants à attribuer

#### 6.2 Contraintes d'Auditoires
- **Table** : `contraintes_auditoires`
- **Composant** : `ContraintesAuditoires`
- **Fonctionnalité** : Configuration du nombre de surveillants par salle

#### 6.3 Moteur d'Attribution
- **Composant** : `IntelligentAssignmentEngine`
- **Algorithme** :
  - Respect des quotas individuels
  - Optimisation des disponibilités
  - Gestion des contraintes (facultés interdites)
  - Attribution équitable

### 7. Planning et Visualisation

#### 7.1 Planning Global
- **Composant** : `PlanningGlobal`
- **Vues** :
  - Planning par surveillant
  - Planning par examen
  - Vue calendaire

#### 7.2 Créneaux de Surveillance
- **Table** : `creneaux_surveillance`
- **Génération automatique** : 45min avant début d'examen
- **Fusion intelligente** : Créneaux qui se chevauchent

### 8. Système de Verrouillage des Fonctionnalités

#### 8.1 Architecture
- **Table** : `feature_locks`
- **Hook** : `useFeatureLocks`
- **Composant** : `FeatureLockManager`

#### 8.2 Protection
- **Composant** : `FeatureProtection`
- **Utilisation** : Wrapper autour des fonctionnalités sensibles
- **Effet** : Blocage des modifications sur fonctionnalités verrouillées

## Base de Données

### Tables Principales

#### Sessions et Examens
- `sessions` : Sessions académiques
- `examens` : Données des examens
- `examens_import_temp` : Import temporaire
- `examens_validation` : Workflow de validation
- `personnes_aidantes` : Équipe pédagogique par examen

#### Surveillants et Disponibilités
- `surveillants` : Données des surveillants
- `surveillant_sessions` : Liaison surveillant-session avec quotas
- `disponibilites` : Disponibilités saisies
- `indisponibilites` : Périodes d'indisponibilité
- `candidats_surveillance` : Candidatures via formulaire public

#### Attributions et Planning
- `attributions` : Attributions finales
- `creneaux_surveillance` : Créneaux temporels générés
- `contraintes_auditoires` : Contraintes par salle
- `contraintes_salles` : Contraintes spécifiques

#### Système et Audit
- `feature_locks` : Verrouillage des fonctionnalités
- `modifications_log` : Log des modifications sensibles
- `profiles` : Profils utilisateurs admin

### Fonctions SQL Importantes

#### `classifier_code_examen()`
Classification automatique des codes d'examen selon le format UCLouvain.

#### `calculer_creneaux_surveillance()`
Génération automatique des créneaux de surveillance (45min avant + durée examen).

#### `fusionner_creneaux_surveillance()`
Fusion des créneaux qui se chevauchent pour optimiser les attributions.

#### `calculate_surveillants_a_attribuer()`
Calcul automatique du nombre de surveillants nécessaires par examen.

### Triggers et Automatisations

- **Auto-calcul créneaux** : Trigger sur insert/update examens
- **Fusion après validation** : Trigger sur validation examens
- **Audit trail** : Trigger sur modifications sensibles
- **Mise à jour timestamps** : Trigger universel updated_at

## Guides d'Utilisation

### Pour les Administrateurs

#### 1. Initialisation d'une Session
1. Créer une nouvelle session (année + période)
2. Activer la session
3. Configurer les contraintes d'auditoires si nécessaire

#### 2. Import des Examens
1. Préparer fichier Excel avec format standardisé
2. Upload via l'interface d'import
3. Réviser les erreurs et warnings
4. Valider batch par batch
5. Générer les tokens enseignants

#### 3. Collecte des Disponibilités
1. Activer la collecte via `DisponibilitesManager`
2. Envoyer les liens aux surveillants
3. Suivre le taux de réponse
4. Traiter les candidatures externes

#### 4. Attribution des Surveillances
1. Vérifier que tous les examens sont validés
2. Lancer le moteur d'attribution automatique
3. Ajuster manuellement si nécessaire
4. Verrouiller les attributions finales

### Pour les Enseignants
1. Recevoir le lien avec token unique
2. Confirmer les détails de l'examen
3. Ajouter l'équipe pédagogique
4. Valider la configuration finale

### Pour les Surveillants
1. Accéder via le lien de disponibilités
2. Saisir les créneaux disponibles
3. Indiquer les préférences (jobistes)
4. Soumettre les disponibilités

## Déploiement et Maintenance

### Prérequis
- Node.js 18+
- Compte Supabase
- Variables d'environnement configurées

### Installation
```bash
npm install
npm run dev
```

### Variables d'Environnement
```
VITE_SUPABASE_URL=votre-url-supabase
VITE_SUPABASE_ANON_KEY=votre-cle-publique
```

### Sauvegarde
- Export régulier des données Supabase
- Backup des contraintes et configurations
- Archivage des sessions complétées

### Monitoring
- Logs Supabase pour les erreurs
- Métriques d'utilisation
- Surveillance des performances

## Sécurité

### Row Level Security (RLS)
- Politiques strictes sur toutes les tables
- Fonction `is_admin()` pour les droits administrateur
- Isolation des données par session

### Tokens Enseignants
- Génération sécurisée (`gen_random_bytes`)
- Expiration automatique
- Usage unique avec tracking

### Audit et Traçabilité
- Log automatique des modifications sensibles
- Triggers sur opérations critiques
- Historique des validations

## Support et Contact

Pour toute question technique ou demande de support :
- Consulter cette documentation
- Vérifier les logs d'erreur dans Supabase
- Contacter l'équipe de développement

## Changelog

### Version Actuelle
- ✅ Système de verrouillage des fonctionnalités
- ✅ Calculs optimisés des surveillants requis
- ✅ Workflow complet import/validation examens
- ✅ Interface unifiée de gestion des surveillants
- ✅ Moteur d'attribution intelligent

### Améliorations Futures
- [ ] Notifications automatiques par email
- [ ] Interface mobile pour les surveillants
- [ ] Intégration avec systèmes RH UCLouvain
- [ ] Analytics avancées et rapports
- [ ] API REST publique pour intégrations

---

**Développé pour UCLouvain - Secteur Sciences de la Santé**
*Documentation mise à jour le : $(date +%Y-%m-%d)*
