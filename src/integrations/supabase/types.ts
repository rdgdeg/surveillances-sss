export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attributions: {
        Row: {
          created_at: string
          examen_id: string
          id: string
          is_locked: boolean
          is_obligatoire: boolean
          is_pre_assigne: boolean
          session_id: string
          surveillant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          examen_id: string
          id?: string
          is_locked?: boolean
          is_obligatoire?: boolean
          is_pre_assigne?: boolean
          session_id: string
          surveillant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          examen_id?: string
          id?: string
          is_locked?: boolean
          is_obligatoire?: boolean
          is_pre_assigne?: boolean
          session_id?: string
          surveillant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributions_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["examen_id"]
          },
          {
            foreignKeyName: "attributions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["surveillant_id"]
          },
          {
            foreignKeyName: "attributions_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      candidats_disponibilites: {
        Row: {
          candidat_id: string | null
          created_at: string
          est_disponible: boolean | null
          examen_id: string | null
          id: string
        }
        Insert: {
          candidat_id?: string | null
          created_at?: string
          est_disponible?: boolean | null
          examen_id?: string | null
          id?: string
        }
        Update: {
          candidat_id?: string | null
          created_at?: string
          est_disponible?: boolean | null
          examen_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidats_disponibilites_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats_surveillance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_disponibilites_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidats_disponibilites_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["examen_id"]
          },
        ]
      }
      candidats_surveillance: {
        Row: {
          created_at: string
          demande_modification_info: boolean | null
          details_modification_demandee: string | null
          email: string
          etp: number | null
          faculte: string | null
          id: string
          nom: string
          preferences_jobiste: Json | null
          prenom: string
          quota_surveillance: number | null
          session_id: string | null
          statut: string
          statut_autre: string | null
          surveillances_a_deduire: number | null
          telephone: string | null
          traite: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demande_modification_info?: boolean | null
          details_modification_demandee?: string | null
          email: string
          etp?: number | null
          faculte?: string | null
          id?: string
          nom: string
          preferences_jobiste?: Json | null
          prenom: string
          quota_surveillance?: number | null
          session_id?: string | null
          statut: string
          statut_autre?: string | null
          surveillances_a_deduire?: number | null
          telephone?: string | null
          traite?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demande_modification_info?: boolean | null
          details_modification_demandee?: string | null
          email?: string
          etp?: number | null
          faculte?: string | null
          id?: string
          nom?: string
          preferences_jobiste?: Json | null
          prenom?: string
          quota_surveillance?: number | null
          session_id?: string | null
          statut?: string
          statut_autre?: string | null
          surveillances_a_deduire?: number | null
          telephone?: string | null
          traite?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidats_surveillance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contraintes_auditoires: {
        Row: {
          adresse: string | null
          auditoire: string
          created_at: string
          description: string | null
          id: string
          lien_google_maps: string | null
          nombre_surveillants_requis: number
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          auditoire: string
          created_at?: string
          description?: string | null
          id?: string
          lien_google_maps?: string | null
          nombre_surveillants_requis?: number
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          auditoire?: string
          created_at?: string
          description?: string | null
          id?: string
          lien_google_maps?: string | null
          nombre_surveillants_requis?: number
          updated_at?: string
        }
        Relationships: []
      }
      contraintes_salles: {
        Row: {
          created_at: string
          id: string
          min_non_jobistes: number
          salle: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_non_jobistes?: number
          salle: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_non_jobistes?: number
          salle?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contraintes_salles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_surveillance: {
        Row: {
          created_at: string
          date_surveillance: string
          examen_id: string
          heure_debut_surveillance: string
          heure_fin_surveillance: string
          id: string
          type_creneau: string
        }
        Insert: {
          created_at?: string
          date_surveillance: string
          examen_id: string
          heure_debut_surveillance: string
          heure_fin_surveillance: string
          id?: string
          type_creneau?: string
        }
        Update: {
          created_at?: string
          date_surveillance?: string
          examen_id?: string
          heure_debut_surveillance?: string
          heure_fin_surveillance?: string
          id?: string
          type_creneau?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_surveillance_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creneaux_surveillance_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["examen_id"]
          },
        ]
      }
      creneaux_surveillance_config: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          heure_debut: string
          heure_fin: string
          id: string
          is_active: boolean
          is_validated: boolean
          nom_creneau: string | null
          session_id: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          is_active?: boolean
          is_validated?: boolean
          nom_creneau?: string | null
          session_id: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          is_active?: boolean
          is_validated?: boolean
          nom_creneau?: string | null
          session_id?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_surveillance_config_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_modification_disponibilites: {
        Row: {
          commentaire_admin: string | null
          created_at: string
          email: string
          id: string
          message: string
          nom: string
          prenom: string
          session_id: string
          statut: string
          traite_par: string | null
          updated_at: string
        }
        Insert: {
          commentaire_admin?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          nom: string
          prenom: string
          session_id: string
          statut?: string
          traite_par?: string | null
          updated_at?: string
        }
        Update: {
          commentaire_admin?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          nom?: string
          prenom?: string
          session_id?: string
          statut?: string
          traite_par?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_modification_disponibilites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_modification_info: {
        Row: {
          anciennes_donnees: Json | null
          candidat_id: string | null
          commentaire: string | null
          created_at: string
          id: string
          nouvelles_donnees: Json | null
          statut: string | null
          surveillant_id: string | null
          traite_par: string | null
          type_modif: string | null
          updated_at: string
        }
        Insert: {
          anciennes_donnees?: Json | null
          candidat_id?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          nouvelles_donnees?: Json | null
          statut?: string | null
          surveillant_id?: string | null
          traite_par?: string | null
          type_modif?: string | null
          updated_at?: string
        }
        Update: {
          anciennes_donnees?: Json | null
          candidat_id?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          nouvelles_donnees?: Json | null
          statut?: string | null
          surveillant_id?: string | null
          traite_par?: string | null
          type_modif?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_modification_info_candidat_id_fkey"
            columns: ["candidat_id"]
            isOneToOne: false
            referencedRelation: "candidats_surveillance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_modification_info_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["surveillant_id"]
          },
          {
            foreignKeyName: "demandes_modification_info_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilites: {
        Row: {
          commentaire_surveillance_obligatoire: string | null
          created_at: string
          date_examen: string
          est_disponible: boolean
          heure_debut: string
          heure_fin: string
          id: string
          nom_examen_obligatoire: string | null
          nom_examen_selectionne: string | null
          session_id: string
          surveillant_id: string
          type_choix: string | null
          updated_at: string
        }
        Insert: {
          commentaire_surveillance_obligatoire?: string | null
          created_at?: string
          date_examen: string
          est_disponible?: boolean
          heure_debut: string
          heure_fin: string
          id?: string
          nom_examen_obligatoire?: string | null
          nom_examen_selectionne?: string | null
          session_id: string
          surveillant_id: string
          type_choix?: string | null
          updated_at?: string
        }
        Update: {
          commentaire_surveillance_obligatoire?: string | null
          created_at?: string
          date_examen?: string
          est_disponible?: boolean
          heure_debut?: string
          heure_fin?: string
          id?: string
          nom_examen_obligatoire?: string | null
          nom_examen_selectionne?: string | null
          session_id?: string
          surveillant_id?: string
          type_choix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilites_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["surveillant_id"]
          },
          {
            foreignKeyName: "disponibilites_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilites_archive: {
        Row: {
          archivé_le: string
          commentaire_surveillance_obligatoire: string | null
          created_at: string
          date_examen: string
          est_disponible: boolean
          heure_debut: string
          heure_fin: string
          id: string
          nom_examen_obligatoire: string | null
          session_id: string
          surveillant_id: string
          updated_at: string
        }
        Insert: {
          archivé_le?: string
          commentaire_surveillance_obligatoire?: string | null
          created_at: string
          date_examen: string
          est_disponible: boolean
          heure_debut: string
          heure_fin: string
          id: string
          nom_examen_obligatoire?: string | null
          session_id: string
          surveillant_id: string
          updated_at: string
        }
        Update: {
          archivé_le?: string
          commentaire_surveillance_obligatoire?: string | null
          created_at?: string
          date_examen?: string
          est_disponible?: boolean
          heure_debut?: string
          heure_fin?: string
          id?: string
          nom_examen_obligatoire?: string | null
          session_id?: string
          surveillant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      examens: {
        Row: {
          auditoire_original: string | null
          besoins_confirmes_par_enseignant: boolean | null
          code_examen: string | null
          created_at: string
          date_confirmation_enseignant: string | null
          date_examen: string
          duree: number | null
          enseignant_email: string | null
          enseignant_nom: string | null
          enseignants: string | null
          etudiants: string | null
          faculte: string | null
          heure_debut: string
          heure_fin: string
          id: string
          is_active: boolean
          lien_enseignant_token: string | null
          matiere: string
          nombre_surveillants: number
          salle: string
          session_id: string
          statut_validation: string | null
          surveillants_a_attribuer: number | null
          surveillants_amenes: number | null
          surveillants_enseignant: number | null
          surveillants_pre_assignes: number | null
          token_expires_at: string | null
          token_used_at: string | null
          type_requis: string
          updated_at: string
        }
        Insert: {
          auditoire_original?: string | null
          besoins_confirmes_par_enseignant?: boolean | null
          code_examen?: string | null
          created_at?: string
          date_confirmation_enseignant?: string | null
          date_examen: string
          duree?: number | null
          enseignant_email?: string | null
          enseignant_nom?: string | null
          enseignants?: string | null
          etudiants?: string | null
          faculte?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          is_active?: boolean
          lien_enseignant_token?: string | null
          matiere: string
          nombre_surveillants?: number
          salle: string
          session_id: string
          statut_validation?: string | null
          surveillants_a_attribuer?: number | null
          surveillants_amenes?: number | null
          surveillants_enseignant?: number | null
          surveillants_pre_assignes?: number | null
          token_expires_at?: string | null
          token_used_at?: string | null
          type_requis: string
          updated_at?: string
        }
        Update: {
          auditoire_original?: string | null
          besoins_confirmes_par_enseignant?: boolean | null
          code_examen?: string | null
          created_at?: string
          date_confirmation_enseignant?: string | null
          date_examen?: string
          duree?: number | null
          enseignant_email?: string | null
          enseignant_nom?: string | null
          enseignants?: string | null
          etudiants?: string | null
          faculte?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          is_active?: boolean
          lien_enseignant_token?: string | null
          matiere?: string
          nombre_surveillants?: number
          salle?: string
          session_id?: string
          statut_validation?: string | null
          surveillants_a_attribuer?: number | null
          surveillants_amenes?: number | null
          surveillants_enseignant?: number | null
          surveillants_pre_assignes?: number | null
          token_expires_at?: string | null
          token_used_at?: string | null
          type_requis?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "examens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      examens_import_temp: {
        Row: {
          created_at: string | null
          data: Json
          erreurs: string | null
          id: string
          import_batch_id: string
          imported_by: string | null
          ordre_import: number
          session_id: string
          statut: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          erreurs?: string | null
          id?: string
          import_batch_id: string
          imported_by?: string | null
          ordre_import: number
          session_id: string
          statut?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          erreurs?: string | null
          id?: string
          import_batch_id?: string
          imported_by?: string | null
          ordre_import?: number
          session_id?: string
          statut?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examens_import_temp_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      examens_validation: {
        Row: {
          code_original: string
          commentaire: string | null
          created_at: string
          date_validation: string | null
          examen_id: string
          id: string
          statut_validation: string
          type_detecte: string | null
          updated_at: string
          valide_par: string | null
        }
        Insert: {
          code_original: string
          commentaire?: string | null
          created_at?: string
          date_validation?: string | null
          examen_id: string
          id?: string
          statut_validation?: string
          type_detecte?: string | null
          updated_at?: string
          valide_par?: string | null
        }
        Update: {
          code_original?: string
          commentaire?: string | null
          created_at?: string
          date_validation?: string | null
          examen_id?: string
          id?: string
          statut_validation?: string
          type_detecte?: string | null
          updated_at?: string
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examens_validation_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "examens_validation_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["examen_id"]
          },
        ]
      }
      feature_locks: {
        Row: {
          category: string
          created_at: string
          description: string
          feature_name: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          feature_name: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          feature_name?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      indisponibilites: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          motif: string | null
          session_id: string
          surveillant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          motif?: string | null
          session_id: string
          surveillant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          motif?: string | null
          session_id?: string
          surveillant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indisponibilites_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indisponibilites_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["surveillant_id"]
          },
          {
            foreignKeyName: "indisponibilites_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      modifications_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          session_id: string
          table_name: string
          user_info: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          session_id: string
          table_name: string
          user_info?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          session_id?: string
          table_name?: string
          user_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modifications_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      personnes_aidantes: {
        Row: {
          ajoute_par: string | null
          compte_dans_quota: boolean
          created_at: string
          email: string | null
          est_assistant: boolean
          examen_id: string
          id: string
          nom: string
          prenom: string
          present_sur_place: boolean
          updated_at: string
        }
        Insert: {
          ajoute_par?: string | null
          compte_dans_quota?: boolean
          created_at?: string
          email?: string | null
          est_assistant?: boolean
          examen_id: string
          id?: string
          nom: string
          prenom: string
          present_sur_place?: boolean
          updated_at?: string
        }
        Update: {
          ajoute_par?: string | null
          compte_dans_quota?: boolean
          created_at?: string
          email?: string | null
          est_assistant?: boolean
          examen_id?: string
          id?: string
          nom?: string
          prenom?: string
          present_sur_place?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnes_aidantes_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "examens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnes_aidantes_examen_id_fkey"
            columns: ["examen_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["examen_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          period: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          period: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          period?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      surveillant_sessions: {
        Row: {
          created_at: string
          date_desactivation: string | null
          id: string
          is_active: boolean
          quota: number
          remarques_desactivation: string | null
          session_id: string
          sessions_imposees: number | null
          surveillant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_desactivation?: string | null
          id?: string
          is_active?: boolean
          quota?: number
          remarques_desactivation?: string | null
          session_id: string
          sessions_imposees?: number | null
          surveillant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_desactivation?: string | null
          id?: string
          is_active?: boolean
          quota?: number
          remarques_desactivation?: string | null
          session_id?: string
          sessions_imposees?: number | null
          surveillant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveillant_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveillant_sessions_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillance_assignments_view"
            referencedColumns: ["surveillant_id"]
          },
          {
            foreignKeyName: "surveillant_sessions_surveillant_id_fkey"
            columns: ["surveillant_id"]
            isOneToOne: false
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      surveillants: {
        Row: {
          affectation_fac: string | null
          campus: string | null
          created_at: string
          date_fin_contrat: string | null
          eft: number | null
          email: string
          faculte_interdite: string | null
          id: string
          nom: string
          prenom: string
          statut: string
          surveillances_a_deduire: number | null
          telephone: string | null
          telephone_gsm: string | null
          type: string
          updated_at: string
        }
        Insert: {
          affectation_fac?: string | null
          campus?: string | null
          created_at?: string
          date_fin_contrat?: string | null
          eft?: number | null
          email: string
          faculte_interdite?: string | null
          id?: string
          nom: string
          prenom: string
          statut?: string
          surveillances_a_deduire?: number | null
          telephone?: string | null
          telephone_gsm?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          affectation_fac?: string | null
          campus?: string | null
          created_at?: string
          date_fin_contrat?: string | null
          eft?: number | null
          email?: string
          faculte_interdite?: string | null
          id?: string
          nom?: string
          prenom?: string
          statut?: string
          surveillances_a_deduire?: number | null
          telephone?: string | null
          telephone_gsm?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      surveillance_assignments_view: {
        Row: {
          attributions_actuelles: number | null
          date_examen: string | null
          email: string | null
          est_disponible: boolean | null
          examen_id: string | null
          heure_debut: string | null
          heure_fin: string | null
          matiere: string | null
          nom: string | null
          nombre_surveillants: number | null
          prenom: string | null
          quota: number | null
          salle: string | null
          sessions_imposees: number | null
          statut: string | null
          surveillant_id: string | null
          surveillant_type: string | null
          type_requis: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculer_creneaux_surveillance: {
        Args: {
          p_examen_id: string
          p_date_examen: string
          p_heure_debut: string
          p_heure_fin: string
        }
        Returns: undefined
      }
      classifier_code_examen: {
        Args: { code_original: string }
        Returns: {
          type_detecte: string
          statut_validation: string
          commentaire: string
        }[]
      }
      fusionner_creneaux_surveillance: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      generate_teacher_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_surveillant_email: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      is_valid_token: {
        Args: { token_to_check: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
