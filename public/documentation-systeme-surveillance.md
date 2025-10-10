# Documentation Système de Gestion de Surveillance d'Examens

## 1. Principe Général de l'Application

### 1.1 Vue d'ensemble
Cette application est un système complet de gestion et d'attribution automatique de surveillants pour les examens universitaires. Elle permet de :
- Gérer les sessions d'examens
- Importer et valider les examens
- Gérer les surveillants et leurs disponibilités
- Attribuer automatiquement les surveillants aux examens selon des contraintes
- Suivre les quotas de surveillance

### 1.2 Flux de travail principal
1. **Configuration de session** : Création d'une session d'examens (période, année)
2. **Import des examens** : Import depuis fichier Excel/CSV avec validation automatique
3. **Gestion des surveillants** : Inscription des surveillants avec leurs caractéristiques
4. **Collecte des disponibilités** : Les surveillants renseignent leurs disponibilités
5. **Attribution automatique** : Algorithme d'attribution selon contraintes et disponibilités
6. **Suivi et ajustements** : Modification manuelle possible des attributions

---

## 2. Architecture de la Base de Données

### 2.1 Tables Principales

#### **sessions**
Représente une période d'examens (ex: Q1 2024-2025)

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| name | text | Nom de la session |
| year | integer | Année académique |
| period | integer | Période (Q1, Q2, etc.) |
| is_active | boolean | Session active ou non |
| planning_general_visible | boolean | Planning visible publiquement |

#### **examens**
Table centrale contenant tous les examens

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| date_examen | date | Date de l'examen |
| heure_debut | time | Heure de début |
| heure_fin | time | Heure de fin |
| matiere | text | Nom de la matière |
| salle | text | Salle/auditoire |
| code_examen | text | Code de l'examen |
| faculte | text | Faculté organisatrice |
| type_requis | text | Type de surveillant requis |
| nombre_surveillants | integer | Nombre total de surveillants |
| surveillants_enseignant | integer | Nombre fournis par l'enseignant |
| surveillants_amenes | integer | Nombre amenés par l'enseignant |
| surveillants_pre_assignes | integer | Nombre pré-assignés |
| surveillants_a_attribuer | integer | Nombre à attribuer (calculé) |
| enseignant_nom | text | Nom de l'enseignant |
| enseignant_email | text | Email de l'enseignant |
| enseignants | text | Liste des enseignants |
| etudiants | text | Nombre/liste d'étudiants |
| statut_validation | text | Statut (VALIDE, REJETE, etc.) |
| is_active | boolean | Examen actif ou désactivé |
| lien_enseignant_token | text | Token pour lien enseignant |
| token_expires_at | timestamp | Expiration du token |
| besoins_confirmes_par_enseignant | boolean | Confirmation enseignant |
| date_confirmation_enseignant | timestamp | Date de confirmation |

**Note importante** : Il n'existe pas de table `enseignants` séparée. Les informations sur les enseignants sont stockées directement dans la table `examens`. Cela évite de créer des relations complexes et permet une flexibilité (un enseignant peut changer d'email, plusieurs enseignants peuvent co-organiser un examen, etc.).

#### **surveillants**
Table des surveillants disponibles

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| nom | text | Nom de famille |
| prenom | text | Prénom |
| email | text | Email (unique) |
| telephone | text | Téléphone fixe |
| telephone_gsm | text | Téléphone mobile |
| type | text | Type (personnel, jobiste, etc.) |
| statut | text | Statut (actif, inactif, etc.) |
| eft | numeric | Équivalent temps plein |
| campus | text | Campus d'affectation |
| affectation_fac | text | Faculté d'affectation |
| faculte_interdite | text | Faculté où il ne peut pas surveiller |
| date_fin_contrat | date | Date de fin de contrat |
| surveillances_a_deduire | integer | Nombre à déduire du quota |

**Types de surveillants** :
- **Personnel** : Personnel académique ou administratif
- **Jobiste** : Étudiants jobistes
- **Externe** : Personnes externes à l'université

#### **surveillant_sessions**
Lien entre surveillants et sessions avec quotas

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| surveillant_id | uuid | Référence au surveillant |
| session_id | uuid | Référence à la session |
| quota | integer | Quota de surveillances (par défaut 6) |
| sessions_imposees | integer | Nombre de surveillances imposées |
| is_active | boolean | Actif dans cette session |
| a_obligations | boolean | A des obligations de surveillance |
| remarques_desactivation | text | Raison de désactivation |

#### **disponibilites**
Disponibilités déclarées par les surveillants

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| surveillant_id | uuid | Référence au surveillant |
| session_id | uuid | Référence à la session |
| date_examen | date | Date |
| heure_debut | time | Heure de début |
| heure_fin | time | Heure de fin |
| est_disponible | boolean | Disponible ou non |
| type_choix | text | Type (souhaitee, obligatoire, etc.) |
| nom_examen_selectionne | text | Nom de l'examen choisi |
| nom_examen_obligatoire | text | Nom de l'examen obligatoire |
| commentaire_surveillance_obligatoire | text | Commentaire |

**Types de choix** :
- **souhaitee** : Disponibilité souhaitée par le surveillant
- **obligatoire** : Surveillance obligatoire imposée
- **pre_assignee** : Pré-assignation (ex: surveillant spécifique requis)

#### **attributions**
Attributions finales des surveillants aux examens

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| surveillant_id | uuid | Référence au surveillant |
| examen_id | uuid | Référence à l'examen |
| session_id | uuid | Référence à la session |
| is_pre_assigne | boolean | Pré-assigné ou non |
| is_obligatoire | boolean | Surveillance obligatoire |
| is_locked | boolean | Attribution verrouillée |

### 2.2 Tables de Contraintes

#### **contraintes_auditoires**
Contraintes spécifiques aux salles/auditoires

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| auditoire | text | Nom de l'auditoire |
| nombre_surveillants_requis | integer | Nombre requis |
| description | text | Description |
| adresse | text | Adresse |
| lien_google_maps | text | Lien Google Maps |

#### **contraintes_salles**
Contraintes par session sur les salles

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| salle | text | Nom de la salle |
| min_non_jobistes | integer | Minimum de non-jobistes requis |

### 2.3 Tables de Gestion des Créneaux

#### **creneaux_surveillance**
Créneaux de surveillance calculés automatiquement

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| examen_id | uuid | Référence à l'examen |
| date_surveillance | date | Date |
| heure_debut_surveillance | time | Début (45 min avant examen) |
| heure_fin_surveillance | time | Fin (fin de l'examen) |
| type_creneau | text | PRINCIPAL ou autre |

**Calcul automatique** : Pour chaque examen validé, un créneau est créé automatiquement avec un début 45 minutes avant l'heure de début de l'examen.

#### **creneaux_surveillance_config**
Configuration des créneaux standards

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| heure_debut | time | Heure de début |
| heure_fin | time | Heure de fin |
| nom_creneau | text | Nom du créneau |
| description | text | Description |
| type_creneau | text | standard, etendu, manuel |
| is_active | boolean | Actif |
| is_validated | boolean | Validé |

#### **creneaux_examens**
Liaison entre créneaux config et examens

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| creneau_id | uuid | Référence au créneau config |
| examen_id | uuid | Référence à l'examen |

### 2.4 Tables de Candidatures

#### **candidats_surveillance**
Candidatures de personnes souhaitant devenir surveillants

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| nom | text | Nom |
| prenom | text | Prénom |
| email | text | Email |
| telephone | text | Téléphone |
| statut | text | Statut (étudiant, externe, etc.) |
| faculte | text | Faculté |
| etp | numeric | ETP si applicable |
| quota_surveillance | integer | Quota souhaité |
| preferences_jobiste | jsonb | Préférences diverses |
| traite | boolean | Candidature traitée |
| demande_modification_info | boolean | Demande modification |

#### **candidats_disponibilites**
Disponibilités des candidats

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| candidat_id | uuid | Référence au candidat |
| examen_id | uuid | Référence à l'examen |
| est_disponible | boolean | Disponible |

### 2.5 Tables de Gestion et Audit

#### **personnes_aidantes**
Personnes aidantes lors des examens (assistants, etc.)

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| examen_id | uuid | Référence à l'examen |
| nom | text | Nom |
| prenom | text | Prénom |
| email | text | Email |
| est_assistant | boolean | Est un assistant |
| compte_dans_quota | boolean | Compte dans le quota |
| present_sur_place | boolean | Présent physiquement |
| ajoute_par | text | Qui a ajouté |

#### **modifications_log**
Journal de toutes les modifications sensibles

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| table_name | text | Table modifiée |
| record_id | uuid | ID de l'enregistrement |
| action | text | INSERT, UPDATE, DELETE |
| old_values | jsonb | Anciennes valeurs |
| new_values | jsonb | Nouvelles valeurs |
| user_info | text | Utilisateur ayant fait la modif |

#### **demandes_modification_disponibilites**
Demandes de modification des disponibilités après soumission

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| nom | text | Nom du demandeur |
| prenom | text | Prénom |
| email | text | Email |
| message | text | Message de demande |
| statut | text | EN_ATTENTE, TRAITE, REJETE |
| commentaire_admin | text | Réponse admin |
| traite_par | text | Traité par |

#### **demandes_modification_info**
Demandes de modification des informations personnelles

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| surveillant_id | uuid | Référence au surveillant |
| candidat_id | uuid | Référence au candidat |
| type_modif | text | Type de modification |
| anciennes_donnees | jsonb | Anciennes données |
| nouvelles_donnees | jsonb | Nouvelles données |
| statut | text | EN_ATTENTE, APPROUVE, REJETE |
| commentaire | text | Commentaire |
| traite_par | text | Traité par |

#### **commentaires_disponibilites**
Commentaires laissés lors de la soumission des disponibilités

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| surveillant_id | uuid | Référence au surveillant |
| nom | text | Nom |
| prenom | text | Prénom |
| email | text | Email |
| message | text | Message/commentaire |
| statut | text | NON_LU, LU |
| lu_par | text | Lu par |
| lu_le | timestamp | Date de lecture |

### 2.6 Tables d'Import et Validation

#### **examens_import_temp**
Stockage temporaire lors de l'import d'examens

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| session_id | uuid | Référence à la session |
| import_batch_id | uuid | ID du lot d'import |
| ordre_import | integer | Ordre dans le fichier |
| data | jsonb | Données brutes importées |
| statut | text | NON_TRAITE, VALIDE, ERREUR |
| erreurs | text | Messages d'erreur |
| imported_by | text | Importé par |

#### **examens_validation**
Validation des codes d'examens

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| examen_id | uuid | Référence à l'examen |
| code_original | text | Code original |
| type_detecte | text | Type détecté (E, O, E+O, etc.) |
| statut_validation | text | EN_ATTENTE, VALIDE, REJETE |
| commentaire | text | Commentaire |
| valide_par | text | Validé par |
| date_validation | timestamp | Date de validation |

**Système de classification automatique** :
- **=E** : Examen écrit (attribution automatique)
- **=O** : Examen oral (rejeté, pas besoin de surveillant)
- **=E+** : Examen mixte (validation manuelle requise)

### 2.7 Tables d'Administration

#### **profiles**
Profils utilisateurs liés à l'authentification

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Référence à auth.users |
| email | text | Email |
| role | text | Rôle (admin par défaut) |

#### **user_roles**
Système de rôles avancé

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| user_id | uuid | Référence à auth.users |
| role | app_role | admin, moderator, user |
| created_by | uuid | Créé par |

#### **feature_locks**
Verrouillage de fonctionnalités

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| feature_name | text | Nom de la fonctionnalité |
| category | text | Catégorie |
| description | text | Description |
| is_locked | boolean | Verrouillé |
| locked_by | text | Verrouillé par |
| locked_at | timestamp | Date de verrouillage |
| notes | text | Notes |

---

## 3. Logique Métier et Calculs

### 3.1 Calcul du nombre de surveillants à attribuer

**Formule** :
```
surveillants_a_attribuer = nombre_surveillants_requis 
                          - surveillants_enseignant 
                          - surveillants_amenes 
                          - surveillants_pre_assignes
```

Où `nombre_surveillants_requis` peut être :
- Le nombre spécifié dans l'examen
- OU le nombre imposé par la contrainte d'auditoire si défini

### 3.2 Calcul du quota théorique

**Pour le personnel** :
```
quota_theorique = floor(EFT × 6)
```

**Pour les jobistes** :
```
quota_theorique = quota_renseigne (par défaut 6)
```

Le quota peut être ajusté manuellement et des surveillances peuvent être déduites.

### 3.3 Algorithme d'attribution automatique

**Critères de l'algorithme** :
1. **Disponibilités** : Le surveillant doit être disponible
2. **Type** : Le type doit correspondre (personnel/jobiste)
3. **Faculté** : Respecter les facultés interdites et d'affectation
4. **Quota** : Ne pas dépasser le quota du surveillant
5. **Contraintes de salle** : Respecter le minimum de non-jobistes
6. **Équité** : Répartir équitablement les surveillances

**Ordre de priorité** :
1. Surveillances obligatoires imposées
2. Pré-assignations (surveillants spécifiques requis)
3. Disponibilités souhaitées
4. Attribution automatique selon critères

### 3.4 Gestion des créneaux de surveillance

**Création automatique** :
- Pour chaque examen validé, création d'un créneau
- Début : 45 minutes avant l'examen
- Fin : fin de l'examen
- Fusion automatique des créneaux qui se chevauchent

**Fonction de fusion** : `fusionner_creneaux_surveillance(session_id)`
- Parcourt tous les créneaux d'une session
- Fusionne les créneaux qui se chevauchent totalement
- Conserve le créneau le plus long

---

## 4. Sécurité et Permissions (RLS)

### 4.1 Système de rôles

**Fonction de vérification** :
```sql
has_role(user_id, role) → boolean
```

**Rôles disponibles** :
- **admin** : Accès complet à toutes les fonctionnalités
- **moderator** : Accès limité (lecture + modération)
- **user** : Accès en lecture seule

### 4.2 Politiques RLS principales

**Examens** :
- Les admins peuvent tout gérer
- Lecture publique pour les examens actifs (pour candidatures)

**Surveillants** :
- Les admins peuvent tout gérer
- Les surveillants peuvent lire leurs propres données

**Disponibilités** :
- Les admins peuvent tout gérer
- Les surveillants peuvent gérer leurs propres disponibilités
- Insertion publique pour permettre la soumission

**Attributions** :
- Gestion exclusive par les admins

**Candidatures** :
- Insertion publique pour permettre les candidatures
- Lecture/modification réservée aux admins

---

## 5. Fonctionnalités Principales

### 5.1 Gestion des Sessions
- Création de sessions d'examens
- Une seule session active à la fois
- Visibilité du planning général paramétrable

### 5.2 Import et Validation des Examens
- Import depuis fichiers Excel/CSV
- Validation automatique des codes d'examens
- Détection automatique du type (écrit/oral/mixte)
- Validation manuelle pour cas ambigus

### 5.3 Gestion des Surveillants
- Inscription et gestion du personnel
- Gestion des contrats et ETP
- Calcul automatique des quotas
- Gestion des facultés autorisées/interdites

### 5.4 Collecte des Disponibilités
- Interface publique pour soumettre disponibilités
- Choix par créneaux horaires
- Indication de préférences (souhaité/obligatoire)
- Système de demandes de modification

### 5.5 Attribution Automatique
- Algorithme d'attribution selon contraintes
- Respect des quotas et disponibilités
- Prise en compte des pré-assignations
- Possibilité d'ajustement manuel

### 5.6 Suivi et Reporting
- Tableaux de bord pour suivi des quotas
- Historique des modifications (audit trail)
- Statistiques par surveillant
- Export des plannings

### 5.7 Communication avec les Enseignants
- Génération de liens avec tokens pour confirmation
- Collecte des besoins en surveillants
- Gestion des personnes aidantes
- Historique des confirmations

---

## 6. Workflows Détaillés

### 6.1 Workflow de Création d'une Session

```
1. Admin crée une nouvelle session (ex: Q1 2024-2025)
2. Import du fichier des examens
3. Validation automatique des examens
4. Traitement manuel des cas nécessitant validation
5. Génération automatique des créneaux de surveillance
6. Activation de la session
7. Ouverture de la collecte des disponibilités
```

### 6.2 Workflow de Collecte des Disponibilités

```
1. Surveillant reçoit l'invitation
2. Accède à l'interface publique via lien
3. Voit la liste des créneaux
4. Indique ses disponibilités pour chaque créneau
5. Peut ajouter des commentaires
6. Soumet le formulaire
7. Reçoit confirmation
8. Peut demander une modification ultérieure si nécessaire
```

### 6.3 Workflow d'Attribution

```
1. Admin lance l'attribution automatique
2. Système traite les surveillances obligatoires
3. Système traite les pré-assignations
4. Système traite les disponibilités souhaitées
5. Système attribue le reste selon critères
6. Admin révise les attributions
7. Admin effectue ajustements manuels si nécessaire
8. Admin verrouille les attributions finales
9. Notification aux surveillants
```

### 6.4 Workflow de Confirmation Enseignant

```
1. Admin génère un lien avec token pour l'enseignant
2. Enseignant reçoit l'email avec lien
3. Enseignant clique sur le lien
4. Voit les informations de son examen
5. Confirme ou modifie les besoins en surveillants
6. Peut ajouter des personnes aidantes
7. Soumet la confirmation
8. Token est marqué comme utilisé
9. Admin reçoit notification
```

---

## 7. Fonctions et Triggers Importants

### 7.1 Fonctions de Calcul

**`calculate_surveillants_a_attribuer()`**
- Trigger sur INSERT/UPDATE de la table examens
- Calcule automatiquement le nombre de surveillants à attribuer

**`calculer_creneaux_surveillance()`**
- Calcule les créneaux pour un examen donné
- Applique la règle des 45 minutes avant

**`fusionner_creneaux_surveillance()`**
- Fusionne les créneaux qui se chevauchent
- Optimise la vue des créneaux

**`generer_creneaux_standards()`**
- Génère automatiquement les créneaux standards
- Basé sur les horaires des examens validés

### 7.2 Fonctions de Validation

**`classifier_code_examen()`**
- Analyse le code de l'examen
- Retourne le type détecté et le statut de validation
- Gère les cas : =E, =O, =E+, etc.

**`is_valid_token()`**
- Vérifie la validité d'un token enseignant
- Contrôle l'expiration

### 7.3 Fonctions de Sécurité

**`has_role()`**
- Vérifie qu'un utilisateur a un rôle spécifique
- Utilisée dans les politiques RLS
- SECURITY DEFINER pour éviter récursion

**`is_admin()`**
- Raccourci pour vérifier le rôle admin
- Utilisée fréquemment dans les politiques

**`audit_sensitive_changes()`**
- Trigger sur plusieurs tables sensibles
- Enregistre toutes les modifications dans modifications_log

### 7.4 Triggers Principaux

**Sur `examens`** :
- `calculate_surveillants_a_attribuer` : Calcul auto du nombre à attribuer
- `trigger_calculer_creneaux_surveillance` : Création des créneaux
- `apres_validation_examens` : Actions après validation
- `audit_sensitive_changes` : Audit des modifications

**Sur `surveillants`** :
- `audit_sensitive_changes` : Audit des modifications
- `update_updated_at_column` : MAJ timestamp

---

## 8. Architecture Technique

### 8.1 Stack Technique
- **Frontend** : React + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **Hosting** : Lovable Cloud

### 8.2 Organisation du Code Frontend
```
src/
├── components/          # Composants React
│   ├── ui/             # Composants UI shadcn
│   ├── *Manager.tsx    # Composants de gestion
│   └── ...
├── pages/              # Pages de l'application
├── hooks/              # Hooks React personnalisés
├── integrations/       # Intégrations (Supabase)
└── lib/               # Utilitaires
```

### 8.3 Patterns de Développement

**Gestion d'état** :
- React Query pour les requêtes serveur
- useState/useReducer pour état local
- Context API pour état global si nécessaire

**Sécurité** :
- Toutes les tables ont RLS activé
- Vérification côté serveur des permissions
- Tokens avec expiration pour liens externes
- Audit trail de toutes les modifications sensibles

**Performance** :
- Index sur les colonnes fréquemment requêtées
- Vues matérialisées pour rapports complexes
- Lazy loading des composants
- Optimistic updates avec React Query

---

## 9. Évolutions Possibles

### 9.1 Fonctionnalités Futures
- Export automatique vers systèmes RH
- Notifications SMS en plus des emails
- Application mobile pour surveillants
- Dashboard de statistiques avancées
- Intégration calendrier (iCal, Google Calendar)
- Système de remplacements en cas d'absence

### 9.2 Optimisations
- Cache des créneaux calculés
- Préchargement des données fréquentes
- Compression des données d'audit
- Archivage automatique des anciennes sessions

---

## 10. Glossaire

**ETP/EFT** : Équivalent Temps Plein - mesure du temps de travail

**Créneau** : Plage horaire de surveillance (typiquement examen + 45 min avant)

**Quota** : Nombre de surveillances qu'un surveillant doit/peut effectuer

**Pré-assignation** : Attribution d'un surveillant spécifique avant l'attribution automatique

**Surveillance obligatoire** : Surveillance imposée à un surveillant (non optionnelle)

**Jobiste** : Étudiant travaillant comme surveillant

**RLS** : Row Level Security - sécurité au niveau des lignes de données

**Token** : Jeton temporaire permettant un accès limité (ex: confirmation enseignant)

---

## Annexes

### A. Schéma des Relations Principales

```
sessions (1) ──> (*) examens
                      │
                      ├──> (*) attributions (*)  ──> surveillants (1)
                      ├──> (*) creneaux_surveillance
                      └──> (*) personnes_aidantes

surveillants (1) ──> (*) surveillant_sessions (*) ──> sessions (1)
                 └──> (*) disponibilites
                 └──> (*) indisponibilites

examens (*) ──> (1) contraintes_auditoires (via salle)
```

### B. Types Énumérés

**statut_validation** (examens) :
- NON_TRAITE
- EN_ATTENTE
- VALIDE
- REJETE
- NECESSITE_VALIDATION

**type_requis** (examens) :
- PERSONNEL
- JOBISTE
- MIXTE

**type** (surveillants) :
- personnel
- jobiste
- externe

**statut** (surveillants) :
- actif
- inactif
- suspendu

**app_role** (user_roles) :
- admin
- moderator
- user

---

**Document généré le** : {{ date }}
**Version** : 1.0
**Projet** : Système de Gestion de Surveillance d'Examens
