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
      admin_approval_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          device_info: string | null
          email: string
          expires_at: string | null
          id: string
          ip_address: string | null
          requested_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          device_info?: string | null
          email: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          device_info?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          requested_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          created_at: string | null
          id: string
          is_from_admin: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          original_content: string | null
          pinned_at: string | null
          pinned_by: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          original_content?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          original_content?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      essays: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          ai_feedback: string | null
          answer: string | null
          created_at: string | null
          id: string
          question: string
          score: number | null
          session_type: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ai_feedback?: string | null
          answer?: string | null
          created_at?: string | null
          id?: string
          question: string
          score?: number | null
          session_type: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ai_feedback?: string | null
          answer?: string | null
          created_at?: string | null
          id?: string
          question?: string
          score?: number | null
          session_type?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      mileage_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_leaderboard: {
        Row: {
          created_at: string | null
          id: string
          month: string
          rank: number | null
          total_mileage: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          rank?: number | null
          total_mileage?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          rank?: number | null
          total_mileage?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_items: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          item_type: string
          name: string
          price: number
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_type: string
          name: string
          price: number
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          item_type?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_model: string | null
          created_at: string | null
          desired_school: string | null
          email: string
          enable_camera: boolean | null
          essay_question_count: number | null
          full_name: string | null
          id: string
          mileage: number | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          created_at?: string | null
          desired_school?: string | null
          email: string
          enable_camera?: boolean | null
          essay_question_count?: number | null
          full_name?: string | null
          id: string
          mileage?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          created_at?: string | null
          desired_school?: string | null
          email?: string
          enable_camera?: boolean | null
          essay_question_count?: number | null
          full_name?: string | null
          id?: string
          mileage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_questions: {
        Row: {
          created_at: string
          essay: string | null
          id: string
          question: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          essay?: string | null
          id?: string
          question: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          essay?: string | null
          id?: string
          question?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_customization: {
        Row: {
          avatar_frame_id: string | null
          badge_id: string | null
          custom_icon_id: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_frame_id?: string | null
          badge_id?: string | null
          custom_icon_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_frame_id?: string | null
          badge_id?: string | null
          custom_icon_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_customization_avatar_frame_id_fkey"
            columns: ["avatar_frame_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_customization_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_customization_custom_icon_id_fkey"
            columns: ["custom_icon_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          id: string
          item_id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "profile_items"
            referencedColumns: ["id"]
          },
        ]
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
      verification_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          type: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          type?: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          type?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      user_approval_requests: {
        Row: {
          approved_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_mileage: {
        Args: { p_amount: number; p_reason: string; p_user_id: string }
        Returns: Json
      }
      award_mileage: {
        Args: {
          p_amount: number
          p_reason: string
          p_session_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_item: { Args: { p_item_id: string }; Returns: Json }
      update_leaderboard_ranks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "elder"
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
      app_role: ["admin", "moderator", "user", "elder"],
    },
  },
} as const
