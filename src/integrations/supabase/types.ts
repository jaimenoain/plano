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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_diagnostic_logs: {
        Row: {
          created_at: string | null
          error_type: string
          id: string
          message: string
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_type: string
          id?: string
          message: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_type?: string
          id?: string
          message?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          resource_id?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_new_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments_old: {
        Row: {
          content: string
          created_at: string
          id: string
          interaction_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          interaction_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          interaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "user_films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          severity: string
          stack_trace: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          severity: string
          stack_trace?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          severity?: string
          stack_trace?: string | null
        }
        Relationships: []
      }
      film_availability: {
        Row: {
          buy: Json | null
          country_code: string
          film_id: string
          id: string
          last_updated: string | null
          rent: Json | null
          stream: Json | null
        }
        Insert: {
          buy?: Json | null
          country_code: string
          film_id: string
          id?: string
          last_updated?: string | null
          rent?: Json | null
          stream?: Json | null
        }
        Update: {
          buy?: Json | null
          country_code?: string
          film_id?: string
          id?: string
          last_updated?: string | null
          rent?: Json | null
          stream?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "film_availability_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
        ]
      }
      films: {
        Row: {
          backdrop_path: string | null
          community_rating_count: number | null
          community_vote_average: number | null
          countries: Json | null
          credits: Json | null
          genre_ids: number[] | null
          id: string
          imdb_id: string | null
          media_type: string
          original_language: string | null
          original_title: string | null
          overview: string | null
          poster_path: string | null
          release_date: string | null
          runtime: number | null
          spoken_languages: Json | null
          title: string
          tmdb_id: number | null
          trailer: string | null
          vote_average: number | null
          watch_providers: Json | null
        }
        Insert: {
          backdrop_path?: string | null
          community_rating_count?: number | null
          community_vote_average?: number | null
          countries?: Json | null
          credits?: Json | null
          genre_ids?: number[] | null
          id?: string
          imdb_id?: string | null
          media_type?: string
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          poster_path?: string | null
          release_date?: string | null
          runtime?: number | null
          spoken_languages?: Json | null
          title: string
          tmdb_id?: number | null
          trailer?: string | null
          vote_average?: number | null
          watch_providers?: Json | null
        }
        Update: {
          backdrop_path?: string | null
          community_rating_count?: number | null
          community_vote_average?: number | null
          countries?: Json | null
          credits?: Json | null
          genre_ids?: number[] | null
          id?: string
          imdb_id?: string | null
          media_type?: string
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          poster_path?: string | null
          release_date?: string | null
          runtime?: number | null
          spoken_languages?: Json | null
          title?: string
          tmdb_id?: number | null
          trailer?: string | null
          vote_average?: number | null
          watch_providers?: Json | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          compatibility_score: number | null
          created_at: string
          follower_id: string
          following_id: string
          is_close_friend: boolean | null
          last_synced_at: string | null
        }
        Insert: {
          compatibility_score?: number | null
          created_at?: string
          follower_id: string
          following_id: string
          is_close_friend?: boolean | null
          last_synced_at?: string | null
        }
        Update: {
          compatibility_score?: number | null
          created_at?: string
          follower_id?: string
          following_id?: string
          is_close_friend?: boolean | null
          last_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_stats: {
        Row: {
          key: string
          last_updated: string | null
          value: number | null
        }
        Insert: {
          key: string
          last_updated?: string | null
          value?: number | null
        }
        Update: {
          key?: string
          last_updated?: string | null
          value?: number | null
        }
        Relationships: []
      }
      group_backlog_items: {
        Row: {
          admin_note: string | null
          created_at: string | null
          cycle_id: string | null
          group_id: string
          id: string
          priority: string
          status: string
          tmdb_id: number
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          cycle_id?: string | null
          group_id: string
          id?: string
          priority?: string
          status?: string
          tmdb_id: number
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          cycle_id?: string | null
          group_id?: string
          id?: string
          priority?: string
          status?: string
          tmdb_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_backlog_items_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "group_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_backlog_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_backlog_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_cycles: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          host_notes: string | null
          id: string
          is_active: boolean | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          host_notes?: string | null
          id?: string
          is_active?: boolean | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          host_notes?: string | null
          id?: string
          is_active?: boolean | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_cycles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          note: string | null
          role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          note?: string | null
          role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          note?: string | null
          role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_private_info: {
        Row: {
          group_id: string
          home_base: string | null
        }
        Insert: {
          group_id: string
          home_base?: string | null
        }
        Update: {
          group_id?: string
          home_base?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_private_info_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          announced_at: string | null
          created_at: string | null
          cycle_id: string | null
          description: string | null
          group_id: string
          host_notes: string | null
          id: string
          location: string | null
          meeting_link: string | null
          resources: Json | null
          session_date: string
          session_timezone: string | null
          session_type: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          announced_at?: string | null
          created_at?: string | null
          cycle_id?: string | null
          description?: string | null
          group_id: string
          host_notes?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          resources?: Json | null
          session_date: string
          session_timezone?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          announced_at?: string | null
          created_at?: string | null
          cycle_id?: string | null
          description?: string | null
          group_id?: string
          host_notes?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          resources?: Json | null
          session_date?: string
          session_timezone?: string | null
          session_type?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "group_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_stats: {
        Row: {
          compatibility: Json
          group_id: string
          last_error: string | null
          members: Json
          scope: string
          summary: Json
          updated_at: string | null
        }
        Insert: {
          compatibility?: Json
          group_id: string
          last_error?: string | null
          members?: Json
          scope?: string
          summary?: Json
          updated_at?: string | null
        }
        Update: {
          compatibility?: Json
          group_id?: string
          last_error?: string | null
          members?: Json
          scope?: string
          summary?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_stats_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_stats_queue: {
        Row: {
          created_at: string | null
          group_id: string
          id: number
          last_update_request: string | null
          processing_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: number
          last_update_request?: string | null
          processing_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: number
          last_update_request?: string | null
          processing_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_stats_queue_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          active_tabs: string[] | null
          announce_email_number: number | null
          announce_email_relative: string | null
          announce_email_unit: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          legacy_session_time: string | null
          links: Json | null
          name: string
          ranking_cache: Json | null
          session_time: string | null
          session_timezone: string | null
          slug: string
          stats_cache: Json | null
        }
        Insert: {
          active_tabs?: string[] | null
          announce_email_number?: number | null
          announce_email_relative?: string | null
          announce_email_unit?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          legacy_session_time?: string | null
          links?: Json | null
          name: string
          ranking_cache?: Json | null
          session_time?: string | null
          session_timezone?: string | null
          slug: string
          stats_cache?: Json | null
        }
        Update: {
          active_tabs?: string[] | null
          announce_email_number?: number | null
          announce_email_relative?: string | null
          announce_email_unit?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          legacy_session_time?: string | null
          links?: Json | null
          name?: string
          ranking_cache?: Json | null
          session_time?: string | null
          session_timezone?: string | null
          slug?: string
          stats_cache?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          interaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "user_films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          recommendation_id: string | null
          resource_id: string | null
          session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recommendation_id?: string | null
          resource_id?: string | null
          session_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recommendation_id?: string | null
          resource_id?: string | null
          session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "user_films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          content_type: string
          id: string
          is_correct: boolean | null
          label: string | null
          media_url: string | null
          option_text: string | null
          order_index: number | null
          question_id: string
          tmdb_id: number | null
        }
        Insert: {
          content_type?: string
          id?: string
          is_correct?: boolean | null
          label?: string | null
          media_url?: string | null
          option_text?: string | null
          order_index?: number | null
          question_id: string
          tmdb_id?: number | null
        }
        Update: {
          content_type?: string
          id?: string
          is_correct?: boolean | null
          label?: string | null
          media_url?: string | null
          option_text?: string | null
          order_index?: number | null
          question_id?: string
          tmdb_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "poll_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_questions: {
        Row: {
          allow_custom_answer: boolean | null
          created_at: string | null
          id: string
          is_live_active: boolean | null
          is_revealed: boolean | null
          max_selections: number | null
          media_data: Json | null
          media_type: string | null
          media_url: string | null
          min_selections: number | null
          order_index: number | null
          poll_id: string
          question_text: string
          response_type: string
        }
        Insert: {
          allow_custom_answer?: boolean | null
          created_at?: string | null
          id?: string
          is_live_active?: boolean | null
          is_revealed?: boolean | null
          max_selections?: number | null
          media_data?: Json | null
          media_type?: string | null
          media_url?: string | null
          min_selections?: number | null
          order_index?: number | null
          poll_id: string
          question_text: string
          response_type?: string
        }
        Update: {
          allow_custom_answer?: boolean | null
          created_at?: string | null
          id?: string
          is_live_active?: boolean | null
          is_revealed?: boolean | null
          max_selections?: number | null
          media_data?: Json | null
          media_type?: string | null
          media_url?: string | null
          min_selections?: number | null
          order_index?: number | null
          poll_id?: string
          question_text?: string
          response_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          custom_answer: string | null
          id: string
          option_id: string | null
          poll_id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_answer?: string | null
          id?: string
          option_id?: string | null
          poll_id: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_answer?: string | null
          id?: string
          option_id?: string | null
          poll_id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "poll_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple_votes: boolean | null
          created_at: string | null
          created_by: string
          cycle_id: string | null
          description: string | null
          group_id: string
          id: string
          session_id: string | null
          show_results_before_close: boolean | null
          slug: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          allow_multiple_votes?: boolean | null
          created_at?: string | null
          created_by: string
          cycle_id?: string | null
          description?: string | null
          group_id: string
          id?: string
          session_id?: string | null
          show_results_before_close?: boolean | null
          slug?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          allow_multiple_votes?: boolean | null
          created_at?: string | null
          created_by?: string
          cycle_id?: string | null
          description?: string | null
          group_id?: string
          id?: string
          session_id?: string | null
          show_results_before_close?: boolean | null
          slug?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "group_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email_session_verdicts: boolean | null
          favorites: Json | null
          id: string
          invited_by: string | null
          language: string | null
          last_digest_sent_at: string | null
          last_online: string | null
          location: string | null
          notification_preferences: Json | null
          role: string | null
          show_favorites: boolean | null
          show_highlights: boolean | null
          subscribed_platforms: string[] | null
          updated_at: string | null
          username: string | null
          verified_architect_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email_session_verdicts?: boolean | null
          favorites?: Json | null
          id: string
          invited_by?: string | null
          language?: string | null
          last_digest_sent_at?: string | null
          last_online?: string | null
          location?: string | null
          notification_preferences?: Json | null
          role?: string | null
          show_favorites?: boolean | null
          show_highlights?: boolean | null
          subscribed_platforms?: string[] | null
          updated_at?: string | null
          username?: string | null
          verified_architect_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email_session_verdicts?: boolean | null
          favorites?: Json | null
          id?: string
          invited_by?: string | null
          language?: string | null
          last_digest_sent_at?: string | null
          last_online?: string | null
          location?: string | null
          notification_preferences?: Json | null
          role?: string | null
          show_favorites?: boolean | null
          show_highlights?: boolean | null
          subscribed_platforms?: string[] | null
          updated_at?: string | null
          username?: string | null
          verified_architect_id?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          film_id: string
          id: string
          recipient_id: string
          recommender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          film_id: string
          id?: string
          recipient_id: string
          recommender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          film_id?: string
          id?: string
          recipient_id?: string
          recommender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_pinned: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_pinned?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_pinned?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_cache: {
        Row: {
          created_at: string
          query_hash: string
          results: Json
        }
        Insert: {
          created_at?: string
          query_hash: string
          results: Json
        }
        Update: {
          created_at?: string
          query_hash?: string
          results?: Json
        }
        Relationships: []
      }
      session_comments_old: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_films: {
        Row: {
          film_id: string
          id: string
          is_main: boolean | null
          session_id: string
        }
        Insert: {
          film_id: string
          id?: string
          is_main?: boolean | null
          session_id: string
        }
        Update: {
          film_id?: string
          id?: string
          is_main?: boolean | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_films_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_films_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_likes: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_likes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_errors: {
        Row: {
          created_at: string | null
          error_detail: string | null
          error_message: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suggestion_dismissals: {
        Row: {
          created_at: string | null
          dismissed_user_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed_user_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed_user_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_dismissals_dismissed_user_id_fkey"
            columns: ["dismissed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_aliases_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_aliases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_films: {
        Row: {
          content: string | null
          created_at: string
          edited_at: string | null
          film_id: string
          group_id: string | null
          id: string
          original_language: string | null
          rating: number | null
          status: string
          tags: string[] | null
          translated_content: string | null
          user_id: string
          visibility: string | null
          watched_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          film_id: string
          group_id?: string | null
          id?: string
          original_language?: string | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          translated_content?: string | null
          user_id: string
          visibility?: string | null
          watched_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          film_id?: string
          group_id?: string | null
          id?: string
          original_language?: string | null
          rating?: number | null
          status?: string
          tags?: string[] | null
          translated_content?: string | null
          user_id?: string
          visibility?: string | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_notifications: {
        Row: {
          created_at: string
          film_id: string | null
          id: string
          provider_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          film_id?: string | null
          id?: string
          provider_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          film_id?: string | null
          id?: string
          provider_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_notifications_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      log: {
        Row: {
          content: string | null
          created_at: string | null
          edited_at: string | null
          film_id: string | null
          group_id: string | null
          id: string | null
          original_language: string | null
          rating: number | null
          status: string | null
          tags: string[] | null
          translated_content: string | null
          user_id: string | null
          visibility: string | null
          watched_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          film_id?: string | null
          group_id?: string | null
          id?: string | null
          original_language?: string | null
          rating?: number | null
          status?: string | null
          tags?: string[] | null
          translated_content?: string | null
          user_id?: string | null
          visibility?: string | null
          watched_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          edited_at?: string | null
          film_id?: string | null
          group_id?: string | null
          id?: string | null
          original_language?: string | null
          rating?: number | null
          status?: string | null
          tags?: string[] | null
          translated_content?: string | null
          user_id?: string | null
          visibility?: string | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_film_id_fkey"
            columns: ["film_id"]
            isOneToOne: false
            referencedRelation: "films"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _calc_compatibility: {
        Args: { user_a: string; user_b: string }
        Returns: number
      }
      block_user: {
        Args: {
          p_reason: string
          p_report_abuse?: boolean
          p_report_details?: string
          p_target_id: string
        }
        Returns: undefined
      }
      calculate_global_average_rating: { Args: never; Returns: undefined }
      calculate_scope_stats: {
        Args: {
          p_filter_film_ids: string[]
          p_group_id: string
          p_member_ids: string[]
          p_session_dates: Json
        }
        Returns: Json
      }
      check_group_member: {
        Args: { target_group_id: string }
        Returns: boolean
      }
      debug_group_stats: { Args: never; Returns: Json }
      generate_unique_slug: {
        Args: { group_id: string; name: string }
        Returns: string
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_app_config: {
        Args: never
        Returns: {
          description: string | null
          key: string
          value: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "app_config"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_explorer_feed: {
        Args: { p_exclude_ids?: string[]; p_limit?: number; p_user_id: string }
        Returns: {
          backdrop_path: string
          id: string
          media_type: string
          original_title: string
          overview: string
          poster_path: string
          recommenders: Json
          title: string
          tmdb_id: number
          trailer: string
        }[]
      }
      get_friend_suggestions: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          bio: string
          country: string
          created_at: string
          id: string
          invited_by: string
          location: string
          mutual_count: number
          shared_group_count: number
          updated_at: string
          username: string
        }[]
      }
      get_group_film_stats:
        | {
            Args: { p_film_ids: string[]; p_group_id: string }
            Returns: {
              avg_rating: number
              film_id: string
              log_count: number
            }[]
          }
        | {
            Args: { p_film_ids: string[]; p_group_id: string }
            Returns: {
              avg_rating: number
              film_id: string
              log_count: number
            }[]
          }
      get_group_smart_backlog: {
        Args: {
          p_exclude_seen?: boolean
          p_group_id: string
          p_max_runtime?: number
          p_member_ids: string[]
          p_providers?: string[]
        }
        Returns: {
          id: string
          interested_users: Json
          overlap_count: number
          overview: string
          poster_path: string
          release_date: string
          runtime: number
          title: string
          tmdb_id: number
          total_selected_members: number
          trailer: string
          vote_average: number
        }[]
      }
      get_inviter_facepile: {
        Args: { inviter_id: string }
        Returns: {
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_main_feed: {
        Args: {
          p_limit: number
          p_offset: number
          p_show_group_activity: boolean
        }
        Returns: {
          content: string | null
          created_at: string
          edited_at: string | null
          film_id: string
          group_id: string | null
          id: string
          original_language: string | null
          rating: number | null
          status: string
          tags: string[] | null
          translated_content: string | null
          user_id: string
          visibility: string | null
          watched_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_films"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_monthly_log_counts: { Args: { p_group_id: string }; Returns: Json }
      get_mutual_affinity_users: {
        Args: { user_a_id: string; user_b_id: string }
        Returns: {
          alias: string
          avatar_url: string
          combined_score: number
          score_with_a: number
          score_with_b: number
          user_id: string
          username: string
        }[]
      }
      get_mutual_follows: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          id: string
          total_count: number
          username: string
        }[]
      }
      get_my_group_ids: { Args: never; Returns: string[] }
      get_shared_directors: {
        Args: { user_a_id: string; user_b_id: string }
        Returns: {
          director_id: number
          name: string
          profile_path: string
          score: number
        }[]
      }
      get_shared_exploration_candidates: {
        Args: {
          p_exclude_ids?: string[]
          p_friend_id: string
          p_limit?: number
          p_user_id: string
        }
        Returns: {
          backdrop_path: string
          id: string
          media_type: string
          original_title: string
          overview: string
          poster_path: string
          recommenders: Json
          title: string
          tmdb_id: number
          trailer: string
        }[]
      }
      get_user_digest_activity: {
        Args: { p_since: string; p_user_id: string }
        Returns: Json
      }
      get_user_groups_summary: {
        Args: { p_limit?: number; p_type?: string; p_user_id: string }
        Returns: {
          cover_url: string
          description: string
          id: string
          is_public: boolean
          last_session_date: string
          member_avatars: string[]
          member_count: number
          name: string
          next_session_date: string
          recent_posters: string[]
          slug: string
        }[]
      }
      get_user_tags: {
        Args: { p_user_id: string }
        Returns: {
          tag: string
        }[]
      }
      invoke_group_stats_update: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      invoke_translate_review: {
        Args: { p_content: string; p_review_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_group_admin: { Args: { check_group_id: string }; Returns: boolean }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_mutual: { Args: { user_a: string; user_b: string }; Returns: boolean }
      is_mutual_contact: {
        Args: { user_id_a: string; user_id_b: string }
        Returns: boolean
      }
      merge_group_stats_compatibility: {
        Args: {
          p_group_id: string
          p_last_error: string
          p_payload: Json
          p_scope: string
          p_updated_at?: string
        }
        Returns: undefined
      }
      merge_group_stats_members: {
        Args: {
          p_group_id: string
          p_scope: string
          p_superlatives: Json
          p_updated_at?: string
        }
        Returns: undefined
      }
      merge_group_stats_summary: {
        Args: {
          p_group_id: string
          p_scope: string
          p_summary: Json
          p_updated_at?: string
        }
        Returns: undefined
      }
      process_session_announcements: { Args: never; Returns: undefined }
      process_session_verdicts: { Args: never; Returns: undefined }
      search_films_debug: {
        Args: {
          p_countries?: string[]
          p_decade_starts?: number[]
          p_genre_ids?: number[]
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_runtime_max?: number
          p_runtime_min?: number
        }
        Returns: {
          community_vote_average: number
          countries: Json
          friend_avg_rating: number
          genre_ids: number[]
          id: string
          latest_interaction: string
          media_type: string
          original_title: string
          overview: string
          poster_path: string
          release_date: string
          runtime: number
          tier: number
          title: string
          tmdb_id: number
          vote_count: number
        }[]
      }
      search_films_tiered: {
        Args: {
          p_countries?: string[]
          p_decade_starts?: number[]
          p_friends_min_rating?: number
          p_genre_ids?: number[]
          p_limit?: number
          p_match_any_personal_filter?: boolean
          p_media_type?: string
          p_min_rating?: number
          p_my_platforms?: string[]
          p_not_seen_by_user_id?: string
          p_offset?: number
          p_only_my_platforms?: boolean
          p_query?: string
          p_rated_by_user_ids?: string[]
          p_rent_buy?: boolean
          p_runtime_max?: number
          p_runtime_min?: number
          p_seen_by_user_id?: string
          p_shuffle_seed?: number
          p_tag?: string
          p_user_country?: string
          p_watchlist_user_id?: string
        }
        Returns: {
          community_vote_average: number
          countries: Json
          friend_avg_rating: number
          genre_ids: number[]
          id: string
          latest_interaction: string
          media_type: string
          original_title: string
          overview: string
          poster_path: string
          release_date: string
          runtime: number
          tier: number
          title: string
          tmdb_id: number
          vote_count: number
        }[]
      }
      send_session_reminders: { Args: never; Returns: undefined }
      track_login: { Args: never; Returns: undefined }
      update_app_config: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      update_group_ranking_cache: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      update_group_stats: {
        Args: { target_group_id: string }
        Returns: undefined
      }
      update_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
