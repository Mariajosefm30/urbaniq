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
      amenities: {
        Row: {
          building_id: string
          capacity: number | null
          close_time: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          open_time: string | null
          rules: string | null
          slot_minutes: number | null
          updated_at: string
        }
        Insert: {
          building_id: string
          capacity?: number | null
          close_time?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          open_time?: string | null
          rules?: string | null
          slot_minutes?: number | null
          updated_at?: string
        }
        Update: {
          building_id?: string
          capacity?: number | null
          close_time?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          open_time?: string | null
          rules?: string | null
          slot_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenities_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_bookings: {
        Row: {
          amenity_id: string
          building_id: string | null
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          status: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amenity_id: string
          building_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amenity_id?: string
          building_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenity_bookings_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_waitlist: {
        Row: {
          amenity_id: string
          building_id: string
          created_at: string
          id: string
          notified_at: string | null
          requested_date: string
          requested_time_end: string
          requested_time_start: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amenity_id: string
          building_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          requested_date: string
          requested_time_end: string
          requested_time_start: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amenity_id?: string
          building_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          requested_date?: string
          requested_time_end?: string
          requested_time_start?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenity_waitlist_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_waitlist_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      building_memberships: {
        Row: {
          building_id: string
          created_at: string
          id: string
          role: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          role: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          role?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_memberships_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string | null
          org_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
          org_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings_new: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          manager_email: string | null
          manager_name: string | null
          name: string
          org_id: string
          street_address: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_email?: string | null
          manager_name?: string | null
          name: string
          org_id: string
          street_address?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_email?: string | null
          manager_name?: string | null
          name?: string
          org_id?: string
          street_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_new_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          author_name: string
          author_role: string
          building_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          author_role: string
          building_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: string
          building_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          arrival_at: string
          created_at: string
          demo_code: string | null
          demo_code_attempts: number | null
          demo_code_status: string | null
          demo_code_verified_at: string | null
          host_id: string
          id: string
          name: string
          qr_expires_at: string
          qr_token_hash: string | null
          redeemed_at: string | null
          status: Database["public"]["Enums"]["guest_status"]
          unit: string | null
          valid_from: string | null
        }
        Insert: {
          arrival_at: string
          created_at?: string
          demo_code?: string | null
          demo_code_attempts?: number | null
          demo_code_status?: string | null
          demo_code_verified_at?: string | null
          host_id: string
          id?: string
          name: string
          qr_expires_at: string
          qr_token_hash?: string | null
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["guest_status"]
          unit?: string | null
          valid_from?: string | null
        }
        Update: {
          arrival_at?: string
          created_at?: string
          demo_code?: string | null
          demo_code_attempts?: number | null
          demo_code_status?: string | null
          demo_code_verified_at?: string | null
          host_id?: string
          id?: string
          name?: string
          qr_expires_at?: string
          qr_token_hash?: string | null
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["guest_status"]
          unit?: string | null
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
          access_code: string | null
          access_code_attempts: number | null
          access_code_status: string | null
          access_code_verified_at: string | null
          actual_cost: number | null
          asset_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
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
          access_code?: string | null
          access_code_attempts?: number | null
          access_code_status?: string | null
          access_code_verified_at?: string | null
          actual_cost?: number | null
          asset_id?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
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
          access_code?: string | null
          access_code_attempts?: number | null
          access_code_status?: string | null
          access_code_verified_at?: string | null
          actual_cost?: number | null
          asset_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
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
      manager_buildings: {
        Row: {
          building_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings_new"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          current_tool: string | null
          id: string
          name: string
          org_onboarding_completed: boolean | null
          org_type: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_intent: string[] | null
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          unit_count: number | null
        }
        Insert: {
          created_at?: string | null
          current_tool?: string | null
          id?: string
          name: string
          org_onboarding_completed?: boolean | null
          org_type?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_intent?: string[] | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          unit_count?: number | null
        }
        Update: {
          created_at?: string | null
          current_tool?: string | null
          id?: string
          name?: string
          org_onboarding_completed?: boolean | null
          org_type?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_intent?: string[] | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          unit_count?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_date: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          building_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_date?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          building_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_date?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          building_address: string | null
          building_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_building_id: string | null
          name: string | null
          org_id: string | null
          role: string | null
          unit: string | null
        }
        Insert: {
          building_address?: string | null
          building_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_building_id?: string | null
          name?: string | null
          org_id?: string | null
          role?: string | null
          unit?: string | null
        }
        Update: {
          building_address?: string | null
          building_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_building_id?: string | null
          name?: string | null
          org_id?: string | null
          role?: string | null
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
          {
            foreignKeyName: "profiles_last_building_id_fkey"
            columns: ["last_building_id"]
            isOneToOne: false
            referencedRelation: "buildings_new"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      units: {
        Row: {
          building_id: string
          code: string
          contact_information: string | null
          created_at: string | null
          id: string
          resident_name: string | null
          resident_user_id: string | null
        }
        Insert: {
          building_id: string
          code?: string
          contact_information?: string | null
          created_at?: string | null
          id?: string
          resident_name?: string | null
          resident_user_id?: string | null
        }
        Update: {
          building_id?: string
          code?: string
          contact_information?: string | null
          created_at?: string | null
          id?: string
          resident_name?: string | null
          resident_user_id?: string | null
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
      waitlist_notifications: {
        Row: {
          amenity_id: string
          booking_id: string
          created_at: string
          id: string
          processed: boolean
          user_id: string
          waitlist_id: string
        }
        Insert: {
          amenity_id: string
          booking_id: string
          created_at?: string
          id?: string
          processed?: boolean
          user_id: string
          waitlist_id: string
        }
        Update: {
          amenity_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          processed?: boolean
          user_id?: string
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_notifications_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "amenity_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_notifications_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "amenity_waitlist"
            referencedColumns: ["id"]
          },
        ]
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
      building_in_admin_org: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_waitlist: { Args: never; Returns: undefined }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_building_role: {
        Args: { _building_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_building_admin: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      is_building_admin_or_manager: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      manager_has_building_access: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      refresh_recurring_alerts: { Args: never; Returns: undefined }
      user_has_building_access: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      user_manages_building: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      user_manages_resident: {
        Args: { _resident_id: string; _user_id: string }
        Returns: boolean
      }
      user_manages_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "resident" | "manager" | "admin" | "superadmin"
      guest_status: "scheduled" | "expired" | "revoked"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_type: "rental" | "maintenance" | "utilities" | "other"
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
      app_role: ["resident", "manager", "admin", "superadmin"],
      guest_status: ["scheduled", "expired", "revoked"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      payment_type: ["rental", "maintenance", "utilities", "other"],
      ticket_status: ["open", "in_progress", "resolved"],
    },
  },
} as const
