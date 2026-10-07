export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          amount: number
          person_id: string
          updated_at: string
          year: number
        }
        Insert: {
          amount: number
          person_id: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          person_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: 'commitments_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      mfa_challenges: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mfa_verified_sessions: {
        Row: {
          expires_at: string
          session_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at: string
          session_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          session_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      opportunity_owners: {
        Row: {
          opportunity_id: string
          person_id: string
        }
        Insert: {
          opportunity_id: string
          person_id: string
        }
        Update: {
          opportunity_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'opportunity_owners_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: false
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opportunity_owners_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
        ]
      }
      opportunity_invoices: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          invoice_month: string | null
          opportunity_id: string
          revenue_year: number
          revenue_year_2: number | null
          sort_order: number
          stage: Database['public']['Enums']['opp_stage']
          stage_since: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_month?: string | null
          opportunity_id: string
          revenue_year: number
          revenue_year_2?: number | null
          sort_order?: number
          stage?: Database['public']['Enums']['opp_stage']
          stage_since?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_month?: string | null
          opportunity_id?: string
          revenue_year?: number
          revenue_year_2?: number | null
          sort_order?: number
          stage?: Database['public']['Enums']['opp_stage']
          stage_since?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'opportunity_invoices_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: false
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          },
        ]
      }
      opportunities: {
        Row: {
          account: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          item: string
          link: string | null
          loa_date: string | null
          next_date: string | null
          next_owner_id: string | null
          next_step: string | null
          notes: string | null
          owner_id: string | null
          probability: number | null
          quote_date: string | null
          quote_no: string | null
          segment: Database['public']['Enums']['segment']
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          item: string
          link?: string | null
          loa_date?: string | null
          next_date?: string | null
          next_owner_id?: string | null
          next_step?: string | null
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          quote_date?: string | null
          quote_no?: string | null
          segment?: Database['public']['Enums']['segment']
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          item?: string
          link?: string | null
          loa_date?: string | null
          next_date?: string | null
          next_owner_id?: string | null
          next_step?: string | null
          notes?: string | null
          owner_id?: string | null
          probability?: number | null
          quote_date?: string | null
          quote_no?: string | null
          segment?: Database['public']['Enums']['segment']
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'opportunities_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opportunities_next_owner_id_fkey'
            columns: ['next_owner_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opportunities_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opportunities_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'people_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database['public']['Enums']['app_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database['public']['Enums']['app_role']
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          company: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          designation: string | null
          email: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          status: Database['public']['Enums']['prospect_status']
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database['public']['Enums']['prospect_status']
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database['public']['Enums']['prospect_status']
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'prospects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prospects_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: false
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prospects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'people'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prospects_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          notes: string | null
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: {
          annual_target: number
          finance_as_of: string | null
          finance_revenue: number
          id: number
          target_year: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          annual_target?: number
          finance_as_of?: string | null
          finance_revenue?: number
          id?: number
          target_year?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          annual_target?: number
          finance_as_of?: string | null
          finance_revenue?: number
          id?: number
          target_year?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage: Database['public']['Enums']['opp_stage'] | null
          id: number
          opportunity_id: string
          to_stage: Database['public']['Enums']['opp_stage']
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database['public']['Enums']['opp_stage'] | null
          id?: never
          opportunity_id: string
          to_stage: Database['public']['Enums']['opp_stage']
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database['public']['Enums']['opp_stage'] | null
          id?: never
          opportunity_id?: string
          to_stage?: Database['public']['Enums']['opp_stage']
        }
        Relationships: [
          {
            foreignKeyName: 'stage_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stage_history_opportunity_id_fkey'
            columns: ['opportunity_id']
            isOneToOne: false
            referencedRelation: 'opportunities'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_manage_login: {
        Args: {
          p_email: string
          p_password: string
          p_person_id?: string
          p_role: Database['public']['Enums']['app_role']
          p_user_id?: string
        }
        Returns: string
      }
      app_current_role: { Args: Record<PropertyKey, never>; Returns: Database['public']['Enums']['app_role'] }
      can_read: { Args: Record<PropertyKey, never>; Returns: boolean }
      can_write: { Args: Record<PropertyKey, never>; Returns: boolean }
      current_session_id: { Args: Record<PropertyKey, never>; Returns: string }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_mfa_verified: { Args: Record<PropertyKey, never>; Returns: boolean }
      my_mfa_status: { Args: Record<PropertyKey, never>; Returns: Json }
      purge_mfa_rows: { Args: Record<PropertyKey, never>; Returns: undefined }
    }
    Enums: {
      app_role: 'admin' | 'editor' | 'viewer'
      opp_stage: 'Lead' | 'Proposal' | 'Quote sent' | 'Verbal yes' | 'LOA/PO' | 'Invoiced' | 'Paid' | 'Lost'
      prospect_status: 'white' | 'orange' | 'yellow' | 'green'
      segment: 'Tech' | 'Agency' | 'Mixed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'editor', 'viewer'],
      opp_stage: ['Lead', 'Proposal', 'Quote sent', 'Verbal yes', 'LOA/PO', 'Invoiced', 'Paid', 'Lost'],
      prospect_status: ['white', 'orange', 'yellow', 'green'],
      segment: ['Tech', 'Agency', 'Mixed'],
    },
  },
} as const
