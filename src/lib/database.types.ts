// Types for the Supabase schema in supabase/migrations.
// Written to match the shape `supabase gen types typescript` produces, so the
// backend team can regenerate this file with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<FK extends string, Cols extends string, Ref extends string> = {
  foreignKeyName: FK;
  columns: [Cols];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          school: string;
          major: string;
          grad_year: number | null;
          bio: string;
          study_styles: string[];
          availability: string[];
          last_course_id: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          school?: string;
          major?: string;
          grad_year?: number | null;
          bio?: string;
          study_styles?: string[];
          availability?: string[];
          last_course_id?: string | null;
          last_seen_at?: string | null;
        };
        Update: {
          full_name?: string;
          school?: string;
          major?: string;
          grad_year?: number | null;
          bio?: string;
          study_styles?: string[];
          availability?: string[];
          last_course_id?: string | null;
          last_seen_at?: string | null;
        };
        Relationships: [Rel<"profiles_last_course_fk", "last_course_id", "courses">];
      };
      contact_cards: {
        Row: { user_id: string; contact: string; updated_at: string };
        Insert: { user_id: string; contact?: string };
        Update: { contact?: string };
        Relationships: [Rel<"contact_cards_user_id_fkey", "user_id", "profiles">];
      };
      courses: {
        Row: {
          id: string;
          code: string;
          title: string;
          term: string;
          instructor: string;
          school: string;
          join_code: string;
          members_count: number;
          notes_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          term: string;
          instructor?: string;
          school?: string;
          created_by: string;
        };
        Update: { code?: string; title?: string; term?: string; instructor?: string; school?: string };
        Relationships: [Rel<"courses_created_by_fkey", "created_by", "profiles">];
      };
      enrollments: {
        Row: { user_id: string; course_id: string; joined_at: string };
        Insert: { user_id: string; course_id: string };
        Update: Record<string, never>;
        Relationships: [
          Rel<"enrollments_user_id_fkey", "user_id", "profiles">,
          Rel<"enrollments_course_id_fkey", "course_id", "courses">,
        ];
      };
      notes: {
        Row: {
          id: string;
          course_id: string;
          author_id: string;
          title: string;
          lecture_date: string;
          topic: string;
          content: string;
          integrity_note: string;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          author_id: string;
          title: string;
          lecture_date: string;
          topic?: string;
          content: string;
          integrity_note?: string;
        };
        Update: { title?: string; lecture_date?: string; topic?: string; content?: string; integrity_note?: string };
        Relationships: [
          Rel<"notes_course_id_fkey", "course_id", "courses">,
          Rel<"notes_author_id_fkey", "author_id", "profiles">,
        ];
      };
      note_reactions: {
        Row: { note_id: string; user_id: string; created_at: string };
        Insert: { note_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [
          Rel<"note_reactions_note_id_fkey", "note_id", "notes">,
          Rel<"note_reactions_user_id_fkey", "user_id", "profiles">,
        ];
      };
      study_groups: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          description: string;
          meeting_time: string;
          location: string;
          capacity: number;
          members_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          description?: string;
          meeting_time?: string;
          location?: string;
          capacity?: number;
          created_by: string;
        };
        Update: { name?: string; description?: string; meeting_time?: string; location?: string; capacity?: number };
        Relationships: [
          Rel<"study_groups_course_id_fkey", "course_id", "courses">,
          Rel<"study_groups_created_by_fkey", "created_by", "profiles">,
        ];
      };
      group_members: {
        Row: { group_id: string; user_id: string; joined_at: string };
        Insert: { group_id: string; user_id: string };
        Update: Record<string, never>;
        Relationships: [
          Rel<"group_members_group_id_fkey", "group_id", "study_groups">,
          Rel<"group_members_user_id_fkey", "user_id", "profiles">,
        ];
      };
      group_posts: {
        Row: { id: string; group_id: string; author_id: string; body: string; created_at: string };
        Insert: { group_id: string; author_id: string; body: string };
        Update: Record<string, never>;
        Relationships: [
          Rel<"group_posts_group_id_fkey", "group_id", "study_groups">,
          Rel<"group_posts_author_id_fkey", "author_id", "profiles">,
        ];
      };
      connections: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          course_id: string | null;
          message: string;
          status: "pending" | "accepted" | "declined";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          requester_id: string;
          addressee_id: string;
          course_id?: string | null;
          message?: string;
        };
        Update: { status?: "pending" | "accepted" | "declined"; responded_at?: string | null };
        Relationships: [
          Rel<"connections_requester_id_fkey", "requester_id", "profiles">,
          Rel<"connections_addressee_id_fkey", "addressee_id", "profiles">,
          Rel<"connections_course_id_fkey", "course_id", "courses">,
        ];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          note_id: string | null;
          lecture_date: string | null;
          kind: "gap_fill" | "catch_up" | "ask";
          question: string;
          content: Json;
          source_note_ids: string[];
          created_at: string;
        };
        Insert: {
          user_id: string;
          course_id: string;
          note_id?: string | null;
          lecture_date?: string | null;
          kind: "gap_fill" | "catch_up" | "ask";
          question?: string;
          content: Json;
          source_note_ids?: string[];
        };
        Update: Record<string, never>;
        Relationships: [
          Rel<"ai_insights_user_id_fkey", "user_id", "profiles">,
          Rel<"ai_insights_course_id_fkey", "course_id", "courses">,
          Rel<"ai_insights_note_id_fkey", "note_id", "notes">,
        ];
      };
      ai_usage: {
        Row: { id: number; user_id: string; kind: string; created_at: string };
        Insert: { user_id: string; kind: string };
        Update: Record<string, never>;
        Relationships: [Rel<"ai_usage_user_id_fkey", "user_id", "profiles">];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      search_courses: {
        Args: { p_query: string; p_limit?: number };
        Returns: { id: string; code: string; title: string; term: string; instructor: string; school: string; members_count: number }[];
      };
      join_course_by_code: {
        Args: { p_code: string };
        Returns: string | null;
      };
      consume_ai_quota: {
        Args: { p_kind: string };
        Returns: boolean;
      };
      search_course_notes: {
        Args: { p_course: string; p_query: string; p_limit?: number };
        Returns: {
          id: string;
          title: string;
          topic: string;
          lecture_date: string;
          author_id: string;
          content: string;
          rank: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
