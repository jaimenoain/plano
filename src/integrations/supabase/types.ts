export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      },
      buildings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          main_image_url: string | null
          location: unknown | null
          name: string
          address: string | null
          architects: string[] | null
          styles: string[] | null
          year_completed: number | null
          city: string | null
          country: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          main_image_url?: string | null
          location?: unknown | null
          name: string
          address?: string | null
          architects?: string[] | null
          styles?: string[] | null
          year_completed?: number | null
          city?: string | null
          country?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          main_image_url?: string | null
          location?: unknown | null
          name?: string
          address?: string | null
          architects?: string[] | null
          styles?: string[] | null
          year_completed?: number | null
          city?: string | null
          country?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
          }
        ]
      }
      comments: {
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
            foreignKeyName: "comments_log_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "user_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
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
          }
        ]
      }
      group_backlog_items: {
        Row: {
          admin_note: string | null
          created_at: string | null
          cycle_id: string | null
          group_id: string
          id: string
          priority: "Low" | "Medium" | "High"
          status: "Pending" | "Scheduled" | "Archived"
          building_id: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          cycle_id?: string | null
          group_id: string
          id?: string
          priority?: "Low" | "Medium" | "High"
          status?: "Pending" | "Scheduled" | "Archived"
          building_id: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          cycle_id?: string | null
          group_id?: string
          id?: string
          priority?: "Low" | "Medium" | "High"
          status?: "Pending" | "Scheduled" | "Archived"
          building_id?: string
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
            foreignKeyName: "group_backlog_items_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_backlog_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
          }
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
          }
        ]
      }
      group_cycles: {
        Row: {
          created_at: string
          description: string | null
          group_id: string
          id: string
          is_active: boolean
          title: string
          status: "active" | "draft" | "archived" | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          title: string
          status?: "active" | "draft" | "archived" | null
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          title?: string
          status?: "active" | "draft" | "archived" | null
        }
        Relationships: [
          {
            foreignKeyName: "group_cycles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      group_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          resources: Json | null
          session_date: string
          title: string | null
          host_notes: string | null
          status: "published" | "draft" | "archived" | null
          cycle_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          resources?: Json | null
          session_date: string
          title?: string | null
          host_notes?: string | null
          status?: "published" | "draft" | "archived" | null
          cycle_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          resources?: Json | null
          session_date?: string
          title?: string | null
          host_notes?: string | null
          status?: "published" | "draft" | "archived" | null
          cycle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          slug: string
          stats_cache: Json | null
          links: Json | null
          active_tabs: string[] | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          slug?: string
          stats_cache?: Json | null
          links?: Json | null
          active_tabs?: string[] | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          slug?: string
          stats_cache?: Json | null
          links?: Json | null
          active_tabs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
            foreignKeyName: "likes_log_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "user_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_buildings: {
        Row: {
          content: string | null
          created_at: string
          edited_at: string | null
          building_id: string
          group_id: string | null
          id: string
          rating: number | null
          status: "pending" | "visited" | "ignored"
          tags: string[] | null
          user_id: string
          visibility: string | null
          visited_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          building_id: string
          group_id?: string | null
          id?: string
          rating?: number | null
          status?: "pending" | "visited" | "ignored"
          tags?: string[] | null
          user_id: string
          visibility?: string | null
          visited_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          building_id?: string
          group_id?: string | null
          id?: string
          rating?: number | null
          status?: "pending" | "visited" | "ignored"
          tags?: string[] | null
          user_id?: string
          visibility?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
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
          }
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean
          resource_id: string | null
          session_id: string | null
          type: "follow" | "like" | "comment" | "group_invitation" | "recommendation" | "new_session" | "friend_joined" | "suggest_follow" | "session_reminder" | "group_activity" | "join_request"
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          resource_id?: string | null
          session_id?: string | null
          type: "follow" | "like" | "comment" | "group_invitation" | "recommendation" | "new_session" | "friend_joined" | "suggest_follow" | "session_reminder" | "group_activity" | "join_request"
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean
          resource_id?: string | null
          session_id?: string | null
          type: "follow" | "like" | "comment" | "group_invitation" | "recommendation" | "new_session" | "friend_joined" | "suggest_follow" | "session_reminder" | "group_activity" | "join_request"
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
            foreignKeyName: "notifications_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "user_buildings"
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
          }
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          question_id: string
          is_correct: boolean | null
          order_index: number
          content_type: string
          media_url: string | null
          building_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          question_id: string
          is_correct?: boolean | null
          order_index?: number
          content_type?: string
          media_url?: string | null
          building_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          question_id?: string
          is_correct?: boolean | null
          order_index?: number
          content_type?: string
          media_url?: string | null
          building_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "poll_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          }
        ]
      }
      poll_questions: {
        Row: {
          allow_custom_answer: boolean | null
          created_at: string
          id: string
          order_index: number
          poll_id: string
          question_text: string
          is_live_active: boolean
          is_revealed: boolean
          min_selections: number | null
          max_selections: number | null
          response_type: string
          media_type: string | null
          media_url: string | null
          media_data: Json | null
        }
        Insert: {
          allow_custom_answer?: boolean | null
          created_at?: string
          id?: string
          order_index?: number
          poll_id: string
          question_text: string
          is_live_active?: boolean
          is_revealed?: boolean
          min_selections?: number | null
          max_selections?: number | null
          response_type?: string
          media_type?: string | null
          media_url?: string | null
          media_data?: Json | null
        }
        Update: {
          allow_custom_answer?: boolean | null
          created_at?: string
          id?: string
          order_index?: number
          poll_id?: string
          question_text?: string
          is_live_active?: boolean
          is_revealed?: boolean
          min_selections?: number | null
          max_selections?: number | null
          response_type?: string
          media_type?: string | null
          media_url?: string | null
          media_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          }
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          custom_answer: string | null
          id: string
          option_id: string | null
          poll_id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_answer?: string | null
          id?: string
          option_id?: string | null
          poll_id: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          }
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          session_id: string | null
          show_results_before_close: boolean | null
          status: string
          title: string
          type: "general" | "building_selection" | "quiz"
          allow_multiple_votes: boolean | null
          cycle_id: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          session_id?: string | null
          show_results_before_close?: boolean | null
          status?: string
          title: string
          type?: "general" | "building_selection" | "quiz"
          allow_multiple_votes?: boolean | null
          cycle_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          session_id?: string | null
          show_results_before_close?: boolean | null
          status?: string
          title?: string
          type?: "general" | "building_selection" | "quiz"
          allow_multiple_votes?: boolean | null
          cycle_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      recommendations: {
        Row: {
          id: string
          recommender_id: string
          recipient_id: string
          building_id: string
          status: "pending" | "accepted" | "ignored" | "visit_with"
          created_at: string
        }
        Insert: {
          id?: string
          recommender_id: string
          recipient_id: string
          building_id: string
          status?: "pending" | "accepted" | "ignored" | "visit_with"
          created_at?: string
        }
        Update: {
          id?: string
          recommender_id?: string
          recipient_id?: string
          building_id?: string
          status?: "pending" | "accepted" | "ignored" | "visit_with"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_recommender_id_fkey"
            columns: ["recommender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recipient_id_fkey"
            columns: ["recipient_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_building_id_fkey"
            columns: ["building_id"]
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          }
        ]
      },
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          reason: string
          details: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          reason: string
          details?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          reason?: string
          details?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      },
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
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          updated_at: string | null
          username: string | null
          country: string | null
          location: string | null
          invited_by: string | null
          favorites: Json | null
          notification_preferences: Json | null
          role: string | null
          last_online: string | null
          subscribed_platforms: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          updated_at?: string | null
          username?: string | null
          country?: string | null
          location?: string | null
          invited_by?: string | null
          favorites?: Json | null
          notification_preferences?: Json | null
          role?: string | null
          last_online?: string | null
          subscribed_platforms?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          updated_at?: string | null
          username?: string | null
          country?: string | null
          location?: string | null
          invited_by?: string | null
          favorites?: Json | null
          notification_preferences?: Json | null
          role?: string | null
          last_online?: string | null
          subscribed_platforms?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      session_comments: {
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
          }
        ]
      }
      session_buildings: {
        Row: {
          building_id: string
          id: string
          is_main: boolean | null
          session_id: string
        }
        Insert: {
          building_id: string
          id?: string
          is_main?: boolean | null
          session_id: string
        }
        Update: {
          building_id?: string
          id?: string
          is_main?: boolean | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_buildings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          }
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
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_nearby_buildings: {
        Args: {
          lat: number
          long: number
          name_query?: string | null
          radius_meters?: number
        }
        Returns: {
          id: string
          name: string
          address: string | null
          location_lat: number
          location_lng: number
          dist_meters: number
          similarity_score: number
        }[]
      }
      get_group_building_stats: {
        Args: {
          p_group_id: string
          p_building_ids: string[]
        }
        Returns: {
          building_id: string
          avg_rating: number
          log_count: number
        }[]
      }
      get_user_groups_summary: {
        Args: {
          p_user_id: string
          p_type?: string
          p_limit?: number
        }
        Returns: {
          id: string
          slug: string
          name: string
          description: string
          is_public: boolean
          cover_url: string
          member_count: number
          member_avatars: string[]
          next_session_date: string
          last_session_date: string
          recent_posters: string[]
        }[]
      }
      get_inviter_facepile: {
        Args: {
          inviter_id: string
        }
        Returns: {
          id: string
          username: string | null
          avatar_url: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export interface UserProfile {
  id: string;
  // ... existing fields
  role?: string; // Add this
}
