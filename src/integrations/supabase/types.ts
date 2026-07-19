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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      buildings: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tier: Database["public"]["Enums"]["building_tier"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tier?: Database["public"]["Enums"]["building_tier"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tier?: Database["public"]["Enums"]["building_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          building_id: string
          concept: string
          created_at: string
          due_date: string | null
          id: string
          period: string | null
          status: Database["public"]["Enums"]["payment_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          building_id: string
          concept: string
          created_at?: string
          due_date?: string | null
          id?: string
          period?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          building_id?: string
          concept?: string
          created_at?: string
          due_date?: string | null
          id?: string
          period?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          building_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          phone: string | null
          resident_name: string | null
          resident_type: string | null
          role: Database["public"]["Enums"]["app_role_v2"]
          token: string
          unit_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          building_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          resident_name?: string | null
          resident_type?: string | null
          role: Database["public"]["Enums"]["app_role_v2"]
          token?: string
          unit_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          building_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          resident_name?: string | null
          resident_type?: string | null
          role?: Database["public"]["Enums"]["app_role_v2"]
          token?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          building_id: string | null
          created_at: string
          id: string
          phone: string | null
          resident_name: string | null
          resident_type: string | null
          role: Database["public"]["Enums"]["app_role_v2"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          resident_name?: string | null
          resident_type?: string | null
          role: Database["public"]["Enums"]["app_role_v2"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          resident_name?: string | null
          resident_type?: string | null
          role?: Database["public"]["Enums"]["app_role_v2"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          building_id: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          building_id: string
          created_at: string
          id: string
          pinned: boolean
        }
        Insert: {
          author_id: string
          body: string
          building_id: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          building_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "posts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          building_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          building_id: string
          code: string
          created_at: string
          id: string
        }
        Insert: {
          building_id: string
          code: string
          created_at?: string
          id?: string
        }
        Update: {
          building_id?: string
          code?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          building_id: string
          created_at: string
          expected_at: string | null
          guest_name: string
          host_id: string
          id: string
          status: Database["public"]["Enums"]["visit_status"]
          unit_id: string | null
        }
        Insert: {
          building_id: string
          created_at?: string
          expected_at?: string | null
          guest_name: string
          host_id: string
          id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          unit_id?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string
          expected_at?: string | null
          guest_name?: string
          host_id?: string
          id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      building_has_feature: {
        Args: { _building_id: string; _feature: string }
        Returns: boolean
      }
      current_user_unit: { Args: { _building_id: string }; Returns: string }
      has_any_building_access: {
        Args: { _building_id: string; _uid: string }
        Returns: boolean
      }
      has_building_role: {
        Args: {
          _building_id: string
          _role: Database["public"]["Enums"]["app_role_v2"]
          _uid: string
        }
        Returns: boolean
      }
      is_board_or_admin: {
        Args: { _building_id: string; _uid: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role_v2: "platform_admin" | "admin_board" | "manager" | "resident"
      building_tier: "starter" | "growth" | "pro" | "developer"
      guest_status: "scheduled" | "expired" | "revoked"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_type: "rental" | "maintenance" | "utilities" | "other"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      visit_status: "expected" | "arrived" | "left"
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
      app_role_v2: ["platform_admin", "admin_board", "manager", "resident"],
      building_tier: ["starter", "growth", "pro", "developer"],
      guest_status: ["scheduled", "expired", "revoked"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      payment_type: ["rental", "maintenance", "utilities", "other"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      visit_status: ["expected", "arrived", "left"],
    },
  },
} as const
