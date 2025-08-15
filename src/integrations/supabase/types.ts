export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointment_notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          line_user_id: string | null
          message_content: string | null
          notification_type: string
          sent_at: string
          sent_to: string
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          line_user_id?: string | null
          message_content?: string | null
          notification_type: string
          sent_at?: string
          sent_to: string
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          line_user_id?: string | null
          message_content?: string | null
          notification_type?: string
          sent_at?: string
          sent_to?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_id: string
          appointment_time: string | null
          created_at: string
          id: string
          line_user_id: string | null
          notes: string | null
          patient_id_number: string | null
          patient_name: string
          patient_phone: string | null
          scheduled_by: string | null
          status: string | null
          updated_at: string
          vaccine_type: string
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          appointment_time?: string | null
          created_at?: string
          id?: string
          line_user_id?: string | null
          notes?: string | null
          patient_id_number?: string | null
          patient_name: string
          patient_phone?: string | null
          scheduled_by?: string | null
          status?: string | null
          updated_at?: string
          vaccine_type: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          appointment_time?: string | null
          created_at?: string
          id?: string
          line_user_id?: string | null
          notes?: string | null
          patient_id_number?: string | null
          patient_name?: string
          patient_phone?: string | null
          scheduled_by?: string | null
          status?: string | null
          updated_at?: string
          vaccine_type?: string
        }
        Relationships: []
      }
      notification_schedules: {
        Row: {
          created_at: string
          id: string
          line_user_id: string | null
          message_content: string | null
          notification_type: string
          patient_tracking_id: string | null
          scheduled_date: string
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_user_id?: string | null
          message_content?: string | null
          notification_type: string
          patient_tracking_id?: string | null
          scheduled_date: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_user_id?: string | null
          message_content?: string | null
          notification_type?: string
          patient_tracking_id?: string | null
          scheduled_date?: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_schedules_patient_tracking_id_fkey"
            columns: ["patient_tracking_id"]
            isOneToOne: false
            referencedRelation: "patient_vaccine_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_registrations: {
        Row: {
          created_at: string
          full_name: string
          hospital: string
          id: string
          notes: string | null
          phone: string
          registration_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hospital?: string
          id?: string
          notes?: string | null
          phone: string
          registration_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hospital?: string
          id?: string
          notes?: string | null
          phone?: string
          registration_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_vaccine_tracking: {
        Row: {
          auto_reminder_enabled: boolean | null
          completion_status: string | null
          contraindication_checked: boolean | null
          contraindication_notes: string | null
          created_at: string
          current_dose: number
          id: string
          last_dose_date: string | null
          next_dose_due: string | null
          patient_id: string
          patient_name: string
          reminder_days_before: number | null
          total_doses: number
          updated_at: string
          vaccine_schedule_id: string | null
        }
        Insert: {
          auto_reminder_enabled?: boolean | null
          completion_status?: string | null
          contraindication_checked?: boolean | null
          contraindication_notes?: string | null
          created_at?: string
          current_dose?: number
          id?: string
          last_dose_date?: string | null
          next_dose_due?: string | null
          patient_id: string
          patient_name: string
          reminder_days_before?: number | null
          total_doses: number
          updated_at?: string
          vaccine_schedule_id?: string | null
        }
        Update: {
          auto_reminder_enabled?: boolean | null
          completion_status?: string | null
          contraindication_checked?: boolean | null
          contraindication_notes?: string | null
          created_at?: string
          current_dose?: number
          id?: string
          last_dose_date?: string | null
          next_dose_due?: string | null
          patient_id?: string
          patient_name?: string
          reminder_days_before?: number | null
          total_doses?: number
          updated_at?: string
          vaccine_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_vaccine_tracking_vaccine_schedule_id_fkey"
            columns: ["vaccine_schedule_id"]
            isOneToOne: false
            referencedRelation: "vaccine_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccine_logs: {
        Row: {
          administered_by: string
          administered_date: string
          appointment_id: string | null
          batch_number: string | null
          created_at: string
          dose_number: number | null
          id: string
          notes: string | null
          patient_name: string
          side_effects: string | null
          updated_at: string
          vaccine_type: string
        }
        Insert: {
          administered_by: string
          administered_date: string
          appointment_id?: string | null
          batch_number?: string | null
          created_at?: string
          dose_number?: number | null
          id?: string
          notes?: string | null
          patient_name: string
          side_effects?: string | null
          updated_at?: string
          vaccine_type: string
        }
        Update: {
          administered_by?: string
          administered_date?: string
          appointment_id?: string | null
          batch_number?: string | null
          created_at?: string
          dose_number?: number | null
          id?: string
          notes?: string | null
          patient_name?: string
          side_effects?: string | null
          updated_at?: string
          vaccine_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_schedules: {
        Row: {
          active: boolean | null
          age_restrictions: Json | null
          booster_interval: number | null
          booster_required: boolean | null
          contraindications: Json | null
          created_at: string
          dose_intervals: Json
          efficacy_duration: number | null
          id: string
          indications: Json | null
          side_effects: Json | null
          total_doses: number
          updated_at: string
          vaccine_name: string
          vaccine_type: string
        }
        Insert: {
          active?: boolean | null
          age_restrictions?: Json | null
          booster_interval?: number | null
          booster_required?: boolean | null
          contraindications?: Json | null
          created_at?: string
          dose_intervals?: Json
          efficacy_duration?: number | null
          id?: string
          indications?: Json | null
          side_effects?: Json | null
          total_doses?: number
          updated_at?: string
          vaccine_name: string
          vaccine_type: string
        }
        Update: {
          active?: boolean | null
          age_restrictions?: Json | null
          booster_interval?: number | null
          booster_required?: boolean | null
          contraindications?: Json | null
          created_at?: string
          dose_intervals?: Json
          efficacy_duration?: number | null
          id?: string
          indications?: Json | null
          side_effects?: Json | null
          total_doses?: number
          updated_at?: string
          vaccine_name?: string
          vaccine_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_make_user_admin: {
        Args: { _user_id: string }
        Returns: undefined
      }
      calculate_next_dose_date: {
        Args: { _patient_tracking_id: string }
        Returns: string
      }
      check_contraindications: {
        Args: { _patient_conditions?: Json; _vaccine_schedule_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_healthcare_staff: {
        Args: { _user_id: string }
        Returns: boolean
      }
      make_user_admin: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "healthcare_staff" | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "healthcare_staff", "patient"],
    },
  },
} as const
