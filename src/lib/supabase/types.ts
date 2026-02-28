export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      lcb_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "membre" | "ca" | "bureau";
          status: "pending" | "approved" | "rejected" | "suspended";
          boat_name: string | null;
          boat_type: string | null;
          mooring_port: string | null;
          phone: string | null;
          bio: string | null;
          avatar_url: string | null;
          notification_prefs: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "membre" | "ca" | "bureau";
          status?: "pending" | "approved" | "rejected" | "suspended";
          boat_name?: string | null;
          boat_type?: string | null;
          mooring_port?: string | null;
          phone?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          notification_prefs?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "membre" | "ca" | "bureau";
          status?: "pending" | "approved" | "rejected" | "suspended";
          boat_name?: string | null;
          boat_type?: string | null;
          mooring_port?: string | null;
          phone?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          notification_prefs?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_posts: {
        Row: {
          id: string;
          author_id: string;
          type:
            | "standard"
            | "service"
            | "plainte"
            | "officiel_bureau"
            | "avis_batellerie";
          title: string | null;
          content: string;
          photos: string[];
          is_pinned: boolean;
          is_hidden: boolean;
          likes_count: number;
          comments_count: number;
          linked_service_id: string | null;
          linked_complaint_id: string | null;
          linked_avis_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          type?:
            | "standard"
            | "service"
            | "plainte"
            | "officiel_bureau"
            | "avis_batellerie";
          title?: string | null;
          content: string;
          photos?: string[];
          is_pinned?: boolean;
          is_hidden?: boolean;
          likes_count?: number;
          comments_count?: number;
          linked_service_id?: string | null;
          linked_complaint_id?: string | null;
          linked_avis_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          type?:
            | "standard"
            | "service"
            | "plainte"
            | "officiel_bureau"
            | "avis_batellerie";
          title?: string | null;
          content?: string;
          photos?: string[];
          is_pinned?: boolean;
          is_hidden?: boolean;
          likes_count?: number;
          comments_count?: number;
          linked_service_id?: string | null;
          linked_complaint_id?: string | null;
          linked_avis_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lcb_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "lcb_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lcb_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          parent_id?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lcb_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "lcb_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lcb_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "lcb_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lcb_comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "lcb_comments";
            referencedColumns: ["id"];
          },
        ];
      };
      lcb_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lcb_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "lcb_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lcb_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "lcb_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lcb_reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          comment_id: string | null;
          reason: string;
          status: string;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason?: string;
          status?: string;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lcb_services: {
        Row: {
          id: string;
          author_id: string;
          category: string;
          title: string;
          description: string;
          photos: string[];
          status: string;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          category: string;
          title: string;
          description: string;
          photos?: string[];
          status?: string;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          category?: string;
          title?: string;
          description?: string;
          photos?: string[];
          status?: string;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_complaints: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string;
          photos: string[];
          latitude: number | null;
          longitude: number | null;
          location_name: string | null;
          status: string;
          priority: string;
          assigned_to: string | null;
          history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description: string;
          photos?: string[];
          latitude?: number | null;
          longitude?: number | null;
          location_name?: string | null;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          description?: string;
          photos?: string[];
          latitude?: number | null;
          longitude?: number | null;
          location_name?: string | null;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_avis_batellerie: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          content: string;
          sector: string;
          is_urgent: boolean;
          weather_data: Json | null;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          content: string;
          sector: string;
          is_urgent?: boolean;
          weather_data?: Json | null;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          content?: string;
          sector?: string;
          is_urgent?: boolean;
          weather_data?: Json | null;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_documents: {
        Row: {
          id: string;
          uploaded_by: string;
          title: string;
          description: string | null;
          category: string;
          year: number;
          file_url: string;
          file_size: number;
          min_role: "membre" | "ca" | "bureau";
          created_at: string;
        };
        Insert: {
          id?: string;
          uploaded_by: string;
          title: string;
          description?: string | null;
          category: string;
          year: number;
          file_url: string;
          file_size: number;
          min_role?: "membre" | "ca" | "bureau";
          created_at?: string;
        };
        Update: {
          id?: string;
          uploaded_by?: string;
          title?: string;
          description?: string | null;
          category?: string;
          year?: number;
          file_url?: string;
          file_size?: number;
          min_role?: "membre" | "ca" | "bureau";
          created_at?: string;
        };
        Relationships: [];
      };
      lcb_events: {
        Row: {
          id: string;
          created_by: string;
          title: string;
          description: string;
          location: string;
          start_date: string;
          end_date: string;
          max_participants: number | null;
          registrations_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          title: string;
          description: string;
          location: string;
          start_date: string;
          end_date: string;
          max_participants?: number | null;
          registrations_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          title?: string;
          description?: string;
          location?: string;
          start_date?: string;
          end_date?: string;
          max_participants?: number | null;
          registrations_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_event_registrations: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      lcb_directory: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          category: string;
          description: string;
          phone: string | null;
          email: string | null;
          website: string | null;
          address: string | null;
          is_approved: boolean;
          approved_by: string | null;
          rating_avg: number;
          rating_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          category: string;
          description: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: string | null;
          is_approved?: boolean;
          approved_by?: string | null;
          rating_avg?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          name?: string;
          category?: string;
          description?: string;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: string | null;
          is_approved?: boolean;
          approved_by?: string | null;
          rating_avg?: number;
          rating_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_directory_reviews: {
        Row: {
          id: string;
          directory_id: string;
          author_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          directory_id: string;
          author_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          directory_id?: string;
          author_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lcb_conversations: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          group_type: string | null;
          avatar_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          is_group?: boolean;
          group_type?: string | null;
          avatar_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          is_group?: boolean;
          group_type?: string | null;
          avatar_url?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lcb_conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Relationships: [];
      };
      lcb_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachments: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          attachments?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          attachments?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      lcb_notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience types for each table
export type Profile =
  Database["public"]["Tables"]["lcb_profiles"]["Row"];
export type ProfileInsert =
  Database["public"]["Tables"]["lcb_profiles"]["Insert"];
export type ProfileUpdate =
  Database["public"]["Tables"]["lcb_profiles"]["Update"];

export type Post = Database["public"]["Tables"]["lcb_posts"]["Row"];
export type PostInsert =
  Database["public"]["Tables"]["lcb_posts"]["Insert"];
export type PostUpdate =
  Database["public"]["Tables"]["lcb_posts"]["Update"];

export type Comment =
  Database["public"]["Tables"]["lcb_comments"]["Row"];
export type CommentInsert =
  Database["public"]["Tables"]["lcb_comments"]["Insert"];
export type CommentUpdate =
  Database["public"]["Tables"]["lcb_comments"]["Update"];

export type Like = Database["public"]["Tables"]["lcb_likes"]["Row"];
export type LikeInsert =
  Database["public"]["Tables"]["lcb_likes"]["Insert"];

export type Report =
  Database["public"]["Tables"]["lcb_reports"]["Row"];
export type ReportInsert =
  Database["public"]["Tables"]["lcb_reports"]["Insert"];
export type ReportUpdate =
  Database["public"]["Tables"]["lcb_reports"]["Update"];

export type Service =
  Database["public"]["Tables"]["lcb_services"]["Row"];
export type ServiceInsert =
  Database["public"]["Tables"]["lcb_services"]["Insert"];
export type ServiceUpdate =
  Database["public"]["Tables"]["lcb_services"]["Update"];

export type Complaint =
  Database["public"]["Tables"]["lcb_complaints"]["Row"];
export type ComplaintInsert =
  Database["public"]["Tables"]["lcb_complaints"]["Insert"];
export type ComplaintUpdate =
  Database["public"]["Tables"]["lcb_complaints"]["Update"];

export type AvisBatellerie =
  Database["public"]["Tables"]["lcb_avis_batellerie"]["Row"];
export type AvisBatellerieInsert =
  Database["public"]["Tables"]["lcb_avis_batellerie"]["Insert"];
export type AvisBatellerieUpdate =
  Database["public"]["Tables"]["lcb_avis_batellerie"]["Update"];

export type Document =
  Database["public"]["Tables"]["lcb_documents"]["Row"];
export type DocumentInsert =
  Database["public"]["Tables"]["lcb_documents"]["Insert"];
export type DocumentUpdate =
  Database["public"]["Tables"]["lcb_documents"]["Update"];

export type Event =
  Database["public"]["Tables"]["lcb_events"]["Row"];
export type EventInsert =
  Database["public"]["Tables"]["lcb_events"]["Insert"];
export type EventUpdate =
  Database["public"]["Tables"]["lcb_events"]["Update"];

export type EventRegistration =
  Database["public"]["Tables"]["lcb_event_registrations"]["Row"];
export type EventRegistrationInsert =
  Database["public"]["Tables"]["lcb_event_registrations"]["Insert"];

export type DirectoryEntry =
  Database["public"]["Tables"]["lcb_directory"]["Row"];
export type DirectoryEntryInsert =
  Database["public"]["Tables"]["lcb_directory"]["Insert"];
export type DirectoryEntryUpdate =
  Database["public"]["Tables"]["lcb_directory"]["Update"];

export type DirectoryReview =
  Database["public"]["Tables"]["lcb_directory_reviews"]["Row"];
export type DirectoryReviewInsert =
  Database["public"]["Tables"]["lcb_directory_reviews"]["Insert"];

export type Conversation =
  Database["public"]["Tables"]["lcb_conversations"]["Row"];
export type ConversationInsert =
  Database["public"]["Tables"]["lcb_conversations"]["Insert"];
export type ConversationUpdate =
  Database["public"]["Tables"]["lcb_conversations"]["Update"];

export type ConversationMember =
  Database["public"]["Tables"]["lcb_conversation_members"]["Row"];
export type ConversationMemberInsert =
  Database["public"]["Tables"]["lcb_conversation_members"]["Insert"];
export type ConversationMemberUpdate =
  Database["public"]["Tables"]["lcb_conversation_members"]["Update"];

export type Message =
  Database["public"]["Tables"]["lcb_messages"]["Row"];
export type MessageInsert =
  Database["public"]["Tables"]["lcb_messages"]["Insert"];
export type MessageUpdate =
  Database["public"]["Tables"]["lcb_messages"]["Update"];

export type Notification =
  Database["public"]["Tables"]["lcb_notifications"]["Row"];
export type NotificationInsert =
  Database["public"]["Tables"]["lcb_notifications"]["Insert"];
export type NotificationUpdate =
  Database["public"]["Tables"]["lcb_notifications"]["Update"];

export type NotificationPrefs = {
  likes?: boolean;
  comments?: boolean;
  replies?: boolean;
  messages?: boolean;
  mentions?: boolean;
  events?: boolean;
  documents?: boolean;
  directory?: boolean;
  reports?: boolean;
};
