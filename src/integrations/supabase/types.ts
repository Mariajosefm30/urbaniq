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
      assets: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          arrival_at: string
          created_at: string
          host_id: string
          id: string
          name: string
          qr_expires_at: string
          qr_token_hash: string
          redeemed_at: string | null
          status: Database["public"]["Enums"]["guest_status"]
          valid_from: string | null
        }
        Insert: {
          arrival_at: string
          created_at?: string
          host_id: string
          id?: string
          name: string
          qr_expires_at: string
          qr_token_hash: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["guest_status"]
          valid_from?: string | null
        }
        Update: {
          arrival_at?: string
          created_at?: string
          host_id?: string
          id?: string
          name?: string
          qr_expires_at?: string
          qr_token_hash?: string
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["guest_status"]
          valid_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          details: Json | null
          id: string
          issue_key: string
          severity: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_key: string
          severity?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          issue_key?: string
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      maintenance_tickets: {
        Row: {
          actual_cost: number | null
          asset_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          photo_url: string | null
          priority: string | null
          reporter_id: string
          resolved_at: string | null
          satisfaction_rating: number | null
          status: Database["public"]["Enums"]["ticket_status"]
          technician_id: string | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          asset_id?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          photo_url?: string | null
          priority?: string | null
          reporter_id: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          technician_id?: string | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          asset_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          photo_url?: string | null
          priority?: string | null
          reporter_id?: string
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: Database["public"]["Enums"]["ticket_status"]
          technician_id?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_asset"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          building_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          name: string | null
          unit: string | null
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          name?: string | null
          unit?: string | null
        }
        Update: {
          building_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          category: string
          created_at: string
          distance: number | null
          id: string
          maps_url: string | null
          name: string
          phone: string
          rating: number | null
        }
        Insert: {
          category: string
          created_at?: string
          distance?: number | null
          id?: string
          maps_url?: string | null
          name: string
          phone: string
          rating?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          distance?: number | null
          id?: string
          maps_url?: string | null
          name?: string
          phone?: string
          rating?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          subject: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          subject: string
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          subject?: string
          unit?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      recurring_issues_60d: {
        Row: {
          asset_id: string | null
          category: string | null
          first_seen: string | null
          incidents: number | null
          issue_key: string | null
          last_seen: string | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_asset"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
          | { _role: string; _user_id: string }
        Returns: boolean
      }
      refresh_recurring_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "resident" | "manager"
      guest_status: "scheduled" | "expired" | "revoked"
      ticket_status: "open" | "in_progress" | "resolved"
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
      app_role: ["resident", "manager"],
      guest_status: ["scheduled", "expired", "revoked"],
      ticket_status: ["open", "in_progress", "resolved"],
    },
  },
} as const
