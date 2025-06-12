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
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      examens: {
        Row: {
          created_at: string
          date_examen: string
          heure_debut: string
          heure_fin: string
          id: string
          matiere: string
          nombre_surveillants: number
          salle: string
          session_id: string
          type_requis: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_examen: string
          heure_debut: string
          heure_fin: string
          id?: string
          matiere: string
          nombre_surveillants?: number
          salle: string
          session_id: string
          type_requis: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_examen?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          matiere?: string
          nombre_surveillants?: number
          salle?: string
          session_id?: string
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
          id: string
          is_active: boolean
          quota: number
          session_id: string
          sessions_imposees: number | null
          surveillant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          quota?: number
          session_id: string
          sessions_imposees?: number | null
          surveillant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          quota?: number
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
            referencedRelation: "surveillants"
            referencedColumns: ["id"]
          },
        ]
      }
      surveillants: {
        Row: {
          created_at: string
          email: string
          id: string
          nom: string
          prenom: string
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nom: string
          prenom: string
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nom?: string
          prenom?: string
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
