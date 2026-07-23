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
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      admin_broadcast_reads: {
        Row: {
          broadcast_id: string
          read_at: string
          recipient_user_id: string
        }
        Insert: {
          broadcast_id: string
          read_at?: string
          recipient_user_id: string
        }
        Update: {
          broadcast_id?: string
          read_at?: string
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "admin_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_broadcast_reads_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_broadcasts: {
        Row: {
          body: string
          id: string
          pinned: boolean
          recipient_scope: string
          scope_value: string | null
          sent_at: string
          sent_by: string
          subject: string
          type: string
        }
        Insert: {
          body: string
          id?: string
          pinned?: boolean
          recipient_scope: string
          scope_value?: string | null
          sent_at?: string
          sent_by: string
          subject: string
          type: string
        }
        Update: {
          body?: string
          id?: string
          pinned?: boolean
          recipient_scope?: string
          scope_value?: string | null
          sent_at?: string
          sent_by?: string
          subject?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_flag_dismissals: {
        Row: {
          dismissed_at: string
          dismissed_by: string
          entity_id: string
          flag_type: string
          id: string
          snooze_until: string | null
        }
        Insert: {
          dismissed_at?: string
          dismissed_by: string
          entity_id: string
          flag_type: string
          id?: string
          snooze_until?: string | null
        }
        Update: {
          dismissed_at?: string
          dismissed_by?: string
          entity_id?: string
          flag_type?: string
          id?: string
          snooze_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_flag_dismissals_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
        }
        Relationships: []
      }
      ambassador_applications: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          interests: string[] | null
          locality_id: string | null
          motivation_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          locality_id?: string | null
          motivation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          locality_id?: string | null
          motivation_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_applications_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_applications_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_building_research_queue: {
        Row: {
          building_id: string
          building_name: string
          chapter_id: string
          current_values: Json
          data_points: Json
          id: string
          researched_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          building_id: string
          building_name: string
          chapter_id: string
          current_values?: Json
          data_points?: Json
          id?: string
          researched_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          building_id?: string
          building_name?: string
          chapter_id?: string
          current_values?: Json
          data_points?: Json
          id?: string
          researched_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_building_research_queue_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_building_research_queue_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_building_research_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_chapters: {
        Row: {
          country_code: string
          created_at: string
          id: string
          last_event_search_at: string | null
          locality_id: string | null
          max_ambassadors: number
          name: string
          parent_chapter_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          last_event_search_at?: string | null
          locality_id?: string | null
          max_ambassadors?: number
          name: string
          parent_chapter_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          last_event_search_at?: string | null
          locality_id?: string | null
          max_ambassadors?: number
          name?: string
          parent_chapter_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_chapters_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_chapters_parent_chapter_id_fkey"
            columns: ["parent_chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_goals: {
        Row: {
          created_at: string
          current_value: number
          due_date: string | null
          id: string
          metric: string
          status: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          due_date?: string | null
          id?: string
          metric: string
          status?: string
          target_value?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          due_date?: string | null
          id?: string
          metric?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ambassador_memberships: {
        Row: {
          chapter_id: string
          contributor_type: string | null
          created_at: string
          exco_responsibility: string | null
          id: string
          invited_by: string | null
          joined_at: string
          onboarded_at: string | null
          preferred_tools: string[] | null
          role: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          contributor_type?: string | null
          created_at?: string
          exco_responsibility?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          onboarded_at?: string | null
          preferred_tools?: string[] | null
          role: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          contributor_type?: string | null
          created_at?: string
          exco_responsibility?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          onboarded_at?: string | null
          preferred_tools?: string[] | null
          role?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_memberships_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          cost_usd: number | null
          created_at: string
          duration_ms: number
          endpoint: string
          error_message: string | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          method: string
          model: string | null
          output_tokens: number | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          duration_ms: number
          endpoint: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          method?: string
          model?: string | null
          output_tokens?: number | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number
          endpoint?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          method?: string
          model?: string | null
          output_tokens?: number | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      architect_claims: {
        Row: {
          architect_id: string
          created_at: string
          id: string
          proof_email: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          architect_id: string
          created_at?: string
          id?: string
          proof_email: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          architect_id?: string
          created_at?: string
          id?: string
          proof_email?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architect_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      architectural_styles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      attribute_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      attributes: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "attribute_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      award_admins: {
        Row: {
          award_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          award_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          award_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_admins_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_admins_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      award_categories: {
        Row: {
          award_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          valid_from_edition_id: string | null
          valid_to_edition_id: string | null
        }
        Insert: {
          award_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          valid_from_edition_id?: string | null
          valid_to_edition_id?: string | null
        }
        Update: {
          award_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          valid_from_edition_id?: string | null
          valid_to_edition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "award_categories_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_categories_valid_from_edition_id_fkey"
            columns: ["valid_from_edition_id"]
            isOneToOne: false
            referencedRelation: "award_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_categories_valid_to_edition_id_fkey"
            columns: ["valid_to_edition_id"]
            isOneToOne: false
            referencedRelation: "award_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      award_claim_requests: {
        Row: {
          award_id: string
          created_at: string
          id: string
          reason: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          award_id: string
          created_at?: string
          id?: string
          reason: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          award_id?: string
          created_at?: string
          id?: string
          reason?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_claim_requests_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_claim_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_claim_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      award_edition_events: {
        Row: {
          created_at: string
          edition_id: string
          event_date: string
          event_type: Database["public"]["Enums"]["award_edition_event_type"]
          id: string
          location: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          event_date: string
          event_type: Database["public"]["Enums"]["award_edition_event_type"]
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["award_edition_event_type"]
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_edition_events_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "award_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      award_editions: {
        Row: {
          award_id: string
          ceremony_location: string | null
          created_at: string
          edition_date: string | null
          edition_label: string | null
          edition_number: number | null
          id: string
          notes: string | null
          slug: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          award_id: string
          ceremony_location?: string | null
          created_at?: string
          edition_date?: string | null
          edition_label?: string | null
          edition_number?: number | null
          id?: string
          notes?: string | null
          slug?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          award_id?: string
          ceremony_location?: string | null
          created_at?: string
          edition_date?: string | null
          edition_label?: string | null
          edition_number?: number | null
          id?: string
          notes?: string | null
          slug?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_editions_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
        ]
      }
      award_recipient_suggestions: {
        Row: {
          award_id: string
          category_id: string | null
          created_at: string
          edition_id: string | null
          id: string
          notes: string | null
          outcome: string
          recipient_building_id: string | null
          recipient_company_id: string | null
          recipient_person_id: string | null
          recipient_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          source_url: string | null
          status: string
          submitted_by: string
          updated_at: string
          year: number | null
        }
        Insert: {
          award_id: string
          category_id?: string | null
          created_at?: string
          edition_id?: string | null
          id?: string
          notes?: string | null
          outcome: string
          recipient_building_id?: string | null
          recipient_company_id?: string | null
          recipient_person_id?: string | null
          recipient_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          source_url?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          award_id?: string
          category_id?: string | null
          created_at?: string
          edition_id?: string | null
          id?: string
          notes?: string | null
          outcome?: string
          recipient_building_id?: string | null
          recipient_company_id?: string | null
          recipient_person_id?: string | null
          recipient_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          source_url?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_recipient_suggestions_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "award_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_recipient_building_id_fkey"
            columns: ["recipient_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_recipient_company_id_fkey"
            columns: ["recipient_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipient_suggestions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      award_recipients: {
        Row: {
          category_id: string
          created_at: string
          edition_id: string
          id: string
          notes: string | null
          outcome: string
          recipient_building_id: string | null
          recipient_company_id: string | null
          recipient_person_id: string | null
          recipient_type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          edition_id: string
          id?: string
          notes?: string | null
          outcome?: string
          recipient_building_id?: string | null
          recipient_company_id?: string | null
          recipient_person_id?: string | null
          recipient_type: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          edition_id?: string
          id?: string
          notes?: string | null
          outcome?: string
          recipient_building_id?: string | null
          recipient_company_id?: string | null
          recipient_person_id?: string | null
          recipient_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_recipients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipients_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "award_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipients_recipient_building_id_fkey"
            columns: ["recipient_building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipients_recipient_company_id_fkey"
            columns: ["recipient_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_recipients_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          awarding_body_company_id: string | null
          awarding_body_name: string | null
          awarding_body_type: string | null
          claim_status: Database["public"]["Enums"]["person_claim_status"]
          country: string | null
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          website: string | null
          wikidata_fetched_at: string | null
          wikidata_qid: string | null
          wikidata_sitelinks: number | null
        }
        Insert: {
          awarding_body_company_id?: string | null
          awarding_body_name?: string | null
          awarding_body_type?: string | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          country?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          website?: string | null
          wikidata_fetched_at?: string | null
          wikidata_qid?: string | null
          wikidata_sitelinks?: number | null
        }
        Update: {
          awarding_body_company_id?: string | null
          awarding_body_name?: string | null
          awarding_body_type?: string | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          country?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
          wikidata_fetched_at?: string | null
          wikidata_qid?: string | null
          wikidata_sitelinks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_awarding_body_company_id_fkey"
            columns: ["awarding_body_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      building_attributes: {
        Row: {
          attribute_id: string
          building_id: string
        }
        Insert: {
          attribute_id: string
          building_id: string
        }
        Update: {
          attribute_id?: string
          building_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_attributes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_audit_logs: {
        Row: {
          building_id: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          building_id: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_audit_logs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      building_credit_notes: {
        Row: {
          content: string
          created_at: string
          credit_id: string
          id: string
          image_urls: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          credit_id: string
          id?: string
          image_urls?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          credit_id?: string
          id?: string
          image_urls?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_credit_notes_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: true
            referencedRelation: "building_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credit_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      building_credits: {
        Row: {
          added_by_user_id: string | null
          building_id: string
          company_id: string | null
          company_portfolio_rank: number | null
          contribution_notes: string | null
          created_at: string
          credit_tier: Database["public"]["Enums"]["credit_tier_enum"]
          display_order: number
          flag_notes: string | null
          flag_reason:
            | Database["public"]["Enums"]["credit_flag_reason_enum"]
            | null
          flagged_at: string | null
          flagged_by_user_id: string | null
          flagged_from_status:
            | Database["public"]["Enums"]["credit_status_enum"]
            | null
          id: string
          is_lead: boolean
          moderated_at: string | null
          moderated_by: string | null
          person_id: string | null
          project_url: string | null
          role: Database["public"]["Enums"]["credit_role_enum"]
          role_custom: string | null
          status: Database["public"]["Enums"]["credit_status_enum"]
          updated_at: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          added_by_user_id?: string | null
          building_id: string
          company_id?: string | null
          company_portfolio_rank?: number | null
          contribution_notes?: string | null
          created_at?: string
          credit_tier?: Database["public"]["Enums"]["credit_tier_enum"]
          display_order?: number
          flag_notes?: string | null
          flag_reason?:
            | Database["public"]["Enums"]["credit_flag_reason_enum"]
            | null
          flagged_at?: string | null
          flagged_by_user_id?: string | null
          flagged_from_status?:
            | Database["public"]["Enums"]["credit_status_enum"]
            | null
          id?: string
          is_lead?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          person_id?: string | null
          project_url?: string | null
          role: Database["public"]["Enums"]["credit_role_enum"]
          role_custom?: string | null
          status?: Database["public"]["Enums"]["credit_status_enum"]
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          added_by_user_id?: string | null
          building_id?: string
          company_id?: string | null
          company_portfolio_rank?: number | null
          contribution_notes?: string | null
          created_at?: string
          credit_tier?: Database["public"]["Enums"]["credit_tier_enum"]
          display_order?: number
          flag_notes?: string | null
          flag_reason?:
            | Database["public"]["Enums"]["credit_flag_reason_enum"]
            | null
          flagged_at?: string | null
          flagged_by_user_id?: string | null
          flagged_from_status?:
            | Database["public"]["Enums"]["credit_status_enum"]
            | null
          id?: string
          is_lead?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          person_id?: string | null
          project_url?: string | null
          role?: Database["public"]["Enums"]["credit_role_enum"]
          role_custom?: string | null
          status?: Database["public"]["Enums"]["credit_status_enum"]
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "building_credits_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credits_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credits_flagged_by_user_id_fkey"
            columns: ["flagged_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credits_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      building_duplicate_dismissals: {
        Row: {
          building_id_1: string
          building_id_2: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          building_id_1: string
          building_id_2: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          building_id_1?: string
          building_id_2?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_duplicate_dismissals_building_id_1_fkey"
            columns: ["building_id_1"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_duplicate_dismissals_building_id_2_fkey"
            columns: ["building_id_2"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_functional_typologies: {
        Row: {
          building_id: string
          typology_id: string
        }
        Insert: {
          building_id: string
          typology_id: string
        }
        Update: {
          building_id?: string
          typology_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_functional_typologies_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_functional_typologies_typology_id_fkey"
            columns: ["typology_id"]
            isOneToOne: false
            referencedRelation: "functional_typologies"
            referencedColumns: ["id"]
          },
        ]
      }
      building_posts: {
        Row: {
          body: string | null
          building_id: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
          visibility: string
        }
        Insert: {
          body?: string | null
          building_id: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
          visibility?: string
        }
        Update: {
          body?: string | null
          building_id?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_posts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_posts_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      building_styles: {
        Row: {
          building_id: string
          created_at: string | null
          style_id: string
        }
        Insert: {
          building_id: string
          created_at?: string | null
          style_id: string
        }
        Update: {
          building_id?: string
          created_at?: string | null
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_styles_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "architectural_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          access: Database["public"]["Enums"]["building_access"] | null
          access_cost:
            | Database["public"]["Enums"]["building_access_cost"]
            | null
          access_level:
            | Database["public"]["Enums"]["building_access_level"]
            | null
          access_logistics:
            | Database["public"]["Enums"]["building_access_logistics"]
            | null
          access_notes: string | null
          address: string | null
          aliases: string[]
          alt_name: string | null
          architect_statement: string | null
          century: number | null
          city: string | null
          community_preview_url: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          functional_category_id: string | null
          height_m: number | null
          hero_image_id: string | null
          hero_image_url: string | null
          id: string
          import_id: string | null
          is_deleted: boolean | null
          is_verified: boolean | null
          locality_id: string | null
          location: unknown
          location_precision: Database["public"]["Enums"]["location_precision"]
          merged_into_id: string | null
          moderated_at: string | null
          moderated_by: string | null
          name: string
          popularity_score: number
          search_vector: unknown
          short_id: number
          size_category: string | null
          size_sqm: number | null
          slug: string | null
          source: string | null
          status: Database["public"]["Enums"]["building_status"] | null
          storeys: number | null
          tier_rank: Database["public"]["Enums"]["building_tier_rank"] | null
          updated_at: string
          year_completed: number | null
        }
        Insert: {
          access?: Database["public"]["Enums"]["building_access"] | null
          access_cost?:
            | Database["public"]["Enums"]["building_access_cost"]
            | null
          access_level?:
            | Database["public"]["Enums"]["building_access_level"]
            | null
          access_logistics?:
            | Database["public"]["Enums"]["building_access_logistics"]
            | null
          access_notes?: string | null
          address?: string | null
          aliases?: string[]
          alt_name?: string | null
          architect_statement?: string | null
          century?: number | null
          city?: string | null
          community_preview_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          functional_category_id?: string | null
          height_m?: number | null
          hero_image_id?: string | null
          hero_image_url?: string | null
          id?: string
          import_id?: string | null
          is_deleted?: boolean | null
          is_verified?: boolean | null
          locality_id?: string | null
          location: unknown
          location_precision?: Database["public"]["Enums"]["location_precision"]
          merged_into_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          name: string
          popularity_score?: number
          search_vector?: unknown
          short_id?: number
          size_category?: string | null
          size_sqm?: number | null
          slug?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["building_status"] | null
          storeys?: number | null
          tier_rank?: Database["public"]["Enums"]["building_tier_rank"] | null
          updated_at?: string
          year_completed?: number | null
        }
        Update: {
          access?: Database["public"]["Enums"]["building_access"] | null
          access_cost?:
            | Database["public"]["Enums"]["building_access_cost"]
            | null
          access_level?:
            | Database["public"]["Enums"]["building_access_level"]
            | null
          access_logistics?:
            | Database["public"]["Enums"]["building_access_logistics"]
            | null
          access_notes?: string | null
          address?: string | null
          aliases?: string[]
          alt_name?: string | null
          architect_statement?: string | null
          century?: number | null
          city?: string | null
          community_preview_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          functional_category_id?: string | null
          height_m?: number | null
          hero_image_id?: string | null
          hero_image_url?: string | null
          id?: string
          import_id?: string | null
          is_deleted?: boolean | null
          is_verified?: boolean | null
          locality_id?: string | null
          location?: unknown
          location_precision?: Database["public"]["Enums"]["location_precision"]
          merged_into_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          name?: string
          popularity_score?: number
          search_vector?: unknown
          short_id?: number
          size_category?: string | null
          size_sqm?: number | null
          slug?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["building_status"] | null
          storeys?: number | null
          tier_rank?: Database["public"]["Enums"]["building_tier_rank"] | null
          updated_at?: string
          year_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_functional_category_id_fkey"
            columns: ["functional_category_id"]
            isOneToOne: false
            referencedRelation: "functional_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_hero_image_id_fkey"
            columns: ["hero_image_id"]
            isOneToOne: false
            referencedRelation: "review_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_projects: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_projects_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_tasks: {
        Row: {
          assigned_to: string | null
          chapter_id: string
          company_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          assigned_to?: string | null
          chapter_id: string
          company_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          assigned_to?: string | null
          chapter_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chapter_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_collaboration_requests: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          message: string | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_collaboration_requests_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_collaboration_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_collaboration_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_contributors: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_contributors_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_favorites: {
        Row: {
          collection_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_favorites_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          building_id: string
          collection_id: string
          created_at: string
          custom_category_id: string | null
          id: string
          is_hidden: boolean
          note: string | null
          order_index: number
        }
        Insert: {
          building_id: string
          collection_id: string
          created_at?: string
          custom_category_id?: string | null
          id?: string
          is_hidden?: boolean
          note?: string | null
          order_index?: number
        }
        Update: {
          building_id?: string
          collection_id?: string
          created_at?: string
          custom_category_id?: string | null
          id?: string
          is_hidden?: boolean
          note?: string | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_markers: {
        Row: {
          address: string | null
          category: string
          collection_id: string
          created_at: string
          created_by: string
          google_place_id: string | null
          google_primary_type: string | null
          id: string
          lat: number
          lng: number
          name: string
          notes: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category: string
          collection_id: string
          created_at?: string
          created_by: string
          google_place_id?: string | null
          google_primary_type?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          notes?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          collection_id?: string
          created_at?: string
          created_by?: string
          google_place_id?: string | null
          google_primary_type?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          notes?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_markers_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          categorization_method: string | null
          categorization_selected_members: string[] | null
          created_at: string
          custom_categories: Json | null
          description: string | null
          external_link: string | null
          id: string
          is_public: boolean
          itinerary: Json | null
          name: string
          owner_id: string
          rating_mode: string | null
          rating_source_user_id: string | null
          show_community_images: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          categorization_method?: string | null
          categorization_selected_members?: string[] | null
          created_at?: string
          custom_categories?: Json | null
          description?: string | null
          external_link?: string | null
          id?: string
          is_public?: boolean
          itinerary?: Json | null
          name: string
          owner_id: string
          rating_mode?: string | null
          rating_source_user_id?: string | null
          show_community_images?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          categorization_method?: string | null
          categorization_selected_members?: string[] | null
          created_at?: string
          custom_categories?: Json | null
          description?: string | null
          external_link?: string | null
          id?: string
          is_public?: boolean
          itinerary?: Json | null
          name?: string
          owner_id?: string
          rating_mode?: string | null
          rating_source_user_id?: string | null
          show_community_images?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_rating_source_user_id_fkey"
            columns: ["rating_source_user_id"]
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
            foreignKeyName: "comments_building_post_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "building_posts"
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
      companies: {
        Row: {
          bio: string | null
          claim_status: Database["public"]["Enums"]["person_claim_status"]
          country: string | null
          created_at: string
          dissolved_year: number | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          search_vector: unknown
          slug: string
          updated_at: string
          verified_domain: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          country?: string | null
          created_at?: string
          dissolved_year?: number | null
          founded_year?: number | null
          id: string
          logo_url?: string | null
          name: string
          search_vector?: unknown
          slug: string
          updated_at?: string
          verified_domain?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          country?: string | null
          created_at?: string
          dissolved_year?: number | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          search_vector?: unknown
          slug?: string
          updated_at?: string
          verified_domain?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_claim_disputes: {
        Row: {
          company_id: string
          created_at: string
          disputed_by_user_id: string
          evidence_url: string | null
          id: string
          reason: string
          status: Database["public"]["Enums"]["company_claim_dispute_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          disputed_by_user_id: string
          evidence_url?: string | null
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["company_claim_dispute_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          disputed_by_user_id?: string
          evidence_url?: string | null
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["company_claim_dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "company_claim_disputes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_claim_disputes_disputed_by_user_id_fkey"
            columns: ["disputed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_claim_verification_tokens: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          email_normalized: string
          expires_at: string
          id: string
          requester_user_id: string
          token_hash: string
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          email_normalized: string
          expires_at: string
          id?: string
          requester_user_id: string
          token_hash: string
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          email_normalized?: string
          expires_at?: string
          id?: string
          requester_user_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_claim_verification_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_claim_verification_tokens_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_steward_invites: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          email_normalized: string
          expires_at: string
          id: string
          invited_by: string | null
          token_hash: string
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          email_normalized: string
          expires_at: string
          id?: string
          invited_by?: string | null
          token_hash: string
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          email_normalized?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_steward_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_steward_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_steward_request_approval_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          request_id: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          request_id: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          request_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_steward_request_approval_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_steward_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_steward_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          requester_notified_at: string | null
          requester_user_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["company_steward_request_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message?: string
          requester_notified_at?: string | null
          requester_user_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["company_steward_request_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          requester_notified_at?: string | null
          requester_user_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["company_steward_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "company_steward_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_steward_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_stewards: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["company_steward_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["company_steward_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_steward_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_stewards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stewards_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notification_log: {
        Row: {
          credit_id: string
          id: string
          recipient_hash: string
          sent_at: string
          token_hash: string
        }
        Insert: {
          credit_id: string
          id?: string
          recipient_hash: string
          sent_at?: string
          token_hash: string
        }
        Update: {
          credit_id?: string
          id?: string
          recipient_hash?: string
          sent_at?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notification_log_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "building_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_removal_tokens: {
        Row: {
          credit_id: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          credit_id: string
          expires_at?: string
          id?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          credit_id?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_removal_tokens_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "building_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_jobs: {
        Row: {
          bucket_name: string
          created_at: string | null
          id: string
          logs: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bucket_name?: string
          created_at?: string | null
          id?: string
          logs?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          id?: string
          logs?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      embassy_event_discoveries: {
        Row: {
          address: string | null
          chapter_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duplicate_of_event_id: string | null
          end_at: string | null
          external_link: string | null
          id: string
          lat: number | null
          lng: number | null
          locality_id: string | null
          published_event_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          snippet: string | null
          source_url: string
          start_at: string
          status: string
          title: string
        }
        Insert: {
          address?: string | null
          chapter_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duplicate_of_event_id?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          locality_id?: string | null
          published_event_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snippet?: string | null
          source_url: string
          start_at: string
          status?: string
          title: string
        }
        Update: {
          address?: string | null
          chapter_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duplicate_of_event_id?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          locality_id?: string | null
          published_event_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snippet?: string | null
          source_url?: string
          start_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "embassy_event_discoveries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embassy_event_discoveries_duplicate_of_event_id_fkey"
            columns: ["duplicate_of_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embassy_event_discoveries_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embassy_event_discoveries_published_event_id_fkey"
            columns: ["published_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embassy_event_discoveries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      embassy_event_search_runs: {
        Row: {
          chapter_id: string
          completed_at: string | null
          error: string | null
          id: string
          items_found: number | null
          started_at: string
          status: string
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          error?: string | null
          id?: string
          items_found?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          items_found?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "embassy_event_search_runs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendances: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["event_attendance_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: Database["public"]["Enums"]["event_attendance_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["event_attendance_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_buildings: {
        Row: {
          building_id: string
          event_id: string
          sort_order: number
        }
        Insert: {
          building_id: string
          event_id: string
          sort_order?: number
        }
        Update: {
          building_id?: string
          event_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_buildings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          city_slug: string | null
          claim_status: Database["public"]["Enums"]["event_claim_status"]
          country_code: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_at: string | null
          external_link: string | null
          id: string
          is_deleted: boolean
          is_self_hosted: boolean
          locality_id: string | null
          location: unknown
          organiser_company_id: string | null
          organiser_person_id: string | null
          organiser_user_id: string | null
          slug: string
          start_at: string
          submitted_by_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_slug?: string | null
          claim_status?: Database["public"]["Enums"]["event_claim_status"]
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          is_deleted?: boolean
          is_self_hosted?: boolean
          locality_id?: string | null
          location?: unknown
          organiser_company_id?: string | null
          organiser_person_id?: string | null
          organiser_user_id?: string | null
          slug: string
          start_at: string
          submitted_by_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_slug?: string | null
          claim_status?: Database["public"]["Enums"]["event_claim_status"]
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          is_deleted?: boolean
          is_self_hosted?: boolean
          locality_id?: string | null
          location?: unknown
          organiser_company_id?: string | null
          organiser_person_id?: string | null
          organiser_user_id?: string | null
          slug?: string
          start_at?: string
          submitted_by_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organiser_company_id_fkey"
            columns: ["organiser_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organiser_person_id_fkey"
            columns: ["organiser_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          console_errors: Json
          created_at: string
          id: string
          message: string
          metadata: Json
          needs_user_input: boolean
          outcome_notes: string | null
          page_url: string | null
          screenshot_path: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          status_changed_at: string | null
          type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          console_errors?: Json
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          needs_user_input?: boolean
          outcome_notes?: string | null
          page_url?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          status_changed_at?: string | null
          type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          console_errors?: Json
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          needs_user_input?: boolean
          outcome_notes?: string | null
          page_url?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          status_changed_at?: string | null
          type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          is_close_friend: boolean
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          is_close_friend?: boolean
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          is_close_friend?: boolean
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
      functional_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      functional_typologies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_category_id: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_category_id: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_category_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "functional_typologies_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "functional_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      image_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_comments_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "review_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_likes: {
        Row: {
          created_at: string
          id: string
          image_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_likes_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "review_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_buildings: {
        Row: {
          city: string | null
          country: string | null
          import_id: string
          latitude: number | null
          location_precision: string | null
          longitude: number | null
          name: string | null
          source: string | null
          year_completed: number | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          import_id: string
          latitude?: number | null
          location_precision?: string | null
          longitude?: number | null
          name?: string | null
          source?: string | null
          year_completed?: number | null
        }
        Update: {
          city?: string | null
          country?: string | null
          import_id?: string
          latitude?: number | null
          location_precision?: string | null
          longitude?: number | null
          name?: string | null
          source?: string | null
          year_completed?: number | null
        }
        Relationships: []
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
            foreignKeyName: "likes_building_post_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "building_posts"
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
      link_likes: {
        Row: {
          created_at: string | null
          id: string
          link_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_likes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "review_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          buildings_count: number
          city: string
          city_slug: string
          country: string
          country_code: string
          created_at: string
          description: string | null
          google_place_id: string | null
          hero_image_url: string | null
          id: string
          lat: number | null
          lng: number | null
          meta_description: string | null
          meta_title: string | null
          region: string | null
          region_slug: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          buildings_count?: number
          city: string
          city_slug: string
          country: string
          country_code: string
          created_at?: string
          description?: string | null
          google_place_id?: string | null
          hero_image_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          meta_description?: string | null
          meta_title?: string | null
          region?: string | null
          region_slug?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          buildings_count?: number
          city?: string
          city_slug?: string
          country?: string
          country_code?: string
          created_at?: string
          description?: string | null
          google_place_id?: string | null
          hero_image_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          meta_description?: string | null
          meta_title?: string | null
          region?: string | null
          region_slug?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      note_views: {
        Row: {
          created_at: string
          note_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_views_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "building_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          architect_id: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          recommendation_id: string | null
          resource_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          architect_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recommendation_id?: string | null
          resource_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          architect_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          recommendation_id?: string | null
          resource_id?: string | null
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
            referencedRelation: "building_posts"
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
      outreach_log: {
        Row: {
          ambassador_id: string
          created_at: string
          firm_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ambassador_id: string
          created_at?: string
          firm_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ambassador_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_log_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_year: number | null
          claim_status: Database["public"]["Enums"]["person_claim_status"]
          claimed_by_user_id: string | null
          created_at: string
          death_year: number | null
          id: string
          location_note: string | null
          name: string
          nationality: string | null
          search_vector: unknown
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          claimed_by_user_id?: string | null
          created_at?: string
          death_year?: number | null
          id: string
          location_note?: string | null
          name: string
          nationality?: string | null
          search_vector?: unknown
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_year?: number | null
          claim_status?: Database["public"]["Enums"]["person_claim_status"]
          claimed_by_user_id?: string | null
          created_at?: string
          death_year?: number | null
          id?: string
          location_note?: string | null
          name?: string
          nationality?: string | null
          search_vector?: unknown
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      person_company_affiliations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          person_id: string
          role_note: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          person_id: string
          role_note?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          person_id?: string
          role_note?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "person_company_affiliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_company_affiliations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_updates: {
        Row: {
          author_id: string
          body: string | null
          country_code: string | null
          created_at: string
          excerpt: string | null
          geo_scope: string
          hero_image_url: string | null
          id: string
          locality_id: string | null
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          country_code?: string | null
          created_at?: string
          excerpt?: string | null
          geo_scope?: string
          hero_image_url?: string | null
          id?: string
          locality_id?: string | null
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          country_code?: string | null
          created_at?: string
          excerpt?: string | null
          geo_scope?: string
          hero_image_url?: string | null
          id?: string
          locality_id?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_updates_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
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
          favorites: Json | null
          firm: string | null
          id: string
          invited_by: string | null
          last_online: string | null
          location: string | null
          notification_preferences: Json | null
          profile_sections: Json | null
          role: string | null
          subscribed_platforms: string[] | null
          updated_at: string | null
          username: string | null
          verified_architect_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          favorites?: Json | null
          firm?: string | null
          id: string
          invited_by?: string | null
          last_online?: string | null
          location?: string | null
          notification_preferences?: Json | null
          profile_sections?: Json | null
          role?: string | null
          subscribed_platforms?: string[] | null
          updated_at?: string | null
          username?: string | null
          verified_architect_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          favorites?: Json | null
          firm?: string | null
          id?: string
          invited_by?: string | null
          last_online?: string | null
          location?: string | null
          notification_preferences?: Json | null
          profile_sections?: Json | null
          role?: string | null
          subscribed_platforms?: string[] | null
          updated_at?: string | null
          username?: string | null
          verified_architect_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      programme_campaign_chapters: {
        Row: {
          campaign_id: string
          chapter_id: string
        }
        Insert: {
          campaign_id: string
          chapter_id: string
        }
        Update: {
          campaign_id?: string
          chapter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_campaign_chapters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "programme_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_campaign_chapters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_campaigns: {
        Row: {
          chapter_scope: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          metric_type: string
          start_date: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          chapter_scope?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          metric_type: string
          start_date: string
          target_value?: number
          title: string
          updated_at?: string
        }
        Update: {
          chapter_scope?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          metric_type?: string
          start_date?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          building_id: string | null
          created_at: string
          event_id: string | null
          id: string
          recipient_id: string
          recommender_id: string
          status: string
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          recipient_id: string
          recommender_id: string
          status?: string
        }
        Update: {
          building_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          recipient_id?: string
          recommender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      review_images: {
        Row: {
          caption: string | null
          created_at: string
          height_px: number | null
          id: string
          is_generated: boolean | null
          is_official: boolean | null
          likes_count: number | null
          moderated_at: string | null
          moderated_by: string | null
          review_id: string
          storage_path: string
          user_id: string
          width_px: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height_px?: number | null
          id?: string
          is_generated?: boolean | null
          is_official?: boolean | null
          likes_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          review_id: string
          storage_path: string
          user_id: string
          width_px?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height_px?: number | null
          id?: string
          is_generated?: boolean | null
          is_official?: boolean | null
          likes_count?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          review_id?: string
          storage_path?: string
          user_id?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_images_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "building_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_links: {
        Row: {
          created_at: string | null
          id: string
          review_id: string
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_id: string
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          review_id?: string
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_links_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "building_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_links_user_id_fkey"
            columns: ["user_id"]
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
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      staging_credits: {
        Row: {
          project_name: string | null
          team_name: string | null
          team_role: string | null
        }
        Insert: {
          project_name?: string | null
          team_name?: string | null
          team_role?: string | null
        }
        Update: {
          project_name?: string | null
          team_name?: string | null
          team_role?: string | null
        }
        Relationships: []
      }
      suggested_profile_hides: {
        Row: {
          created_at: string
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          suggested_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          suggested_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_profile_hides_suggested_user_id_fkey"
            columns: ["suggested_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_profile_hides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_buildings: {
        Row: {
          building_id: string
          created_at: string
          id: string
          rating: number | null
          status: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          user_id?: string
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_buildings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_folder_items: {
        Row: {
          collection_id: string
          created_at: string
          folder_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          folder_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          folder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_folder_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "user_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_folders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      _ambassador_memberships_internal: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          exco_responsibility: string | null
          id: string | null
          invited_by: string | null
          joined_at: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          exco_responsibility?: string | null
          id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          exco_responsibility?: string | null
          id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_memberships_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "ambassador_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _ambassador_can_access_chapter: {
        Args: { p_chapter_id: string }
        Returns: boolean
      }
      _ambassador_profile_matches_chapter: {
        Args: {
          p_chapter: Database["public"]["Tables"]["ambassador_chapters"]["Row"]
          p_country: string
          p_location: string
        }
        Returns: boolean
      }
      _building_in_ambassador_chapter_scope: {
        Args: { p_building_id: string; p_chapter_id: string }
        Returns: boolean
      }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_merge_companies: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: Json
      }
      admin_merge_localities: {
        Args: { p_source_locality_id: string; p_target_locality_id: string }
        Returns: Json
      }
      admin_merge_people: {
        Args: { p_source_person_id: string; p_target_person_id: string }
        Returns: Json
      }
      ambassador_apply_building_research: {
        Args: { p_building_id: string; p_updates: Json }
        Returns: undefined
      }
      ambassador_approve_building: {
        Args: { p_building_id: string }
        Returns: undefined
      }
      ambassador_approve_building_global: {
        Args: { p_building_id: string }
        Returns: undefined
      }
      ambassador_approve_credit: {
        Args: { p_credit_id: string }
        Returns: undefined
      }
      ambassador_approve_credit_global: {
        Args: { p_credit_id: string }
        Returns: undefined
      }
      ambassador_approve_photo: {
        Args: { p_photo_id: string }
        Returns: undefined
      }
      ambassador_approve_video: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      ambassador_discard_event_discovery: {
        Args: { p_discovery_id: string }
        Returns: undefined
      }
      ambassador_dismiss_queued_research: {
        Args: { p_queue_id: string }
        Returns: undefined
      }
      ambassador_publish_event_discovery: {
        Args: { p_discovery_id: string }
        Returns: string
      }
      approve_award_suggestion: {
        Args: { p_suggestion_id: string }
        Returns: string
      }
      approve_company_steward_request: {
        Args: { p_token_hex: string }
        Returns: Json
      }
      approve_company_steward_request_by_id: {
        Args: { p_request_id: string }
        Returns: Json
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
      building_matches_contact_filters: {
        Args: {
          p_building_id: string
          p_contact_min_rating?: number
          p_filter_contacts?: boolean
          p_rated_by?: string[]
        }
        Returns: boolean
      }
      building_matches_credit_filters: {
        Args: { p_building_id: string; p_company_id: string; p_roles: string[] }
        Returns: boolean
      }
      calculate_building_score: {
        Args: { building_uuid: string }
        Returns: undefined
      }
      calculate_scope_stats:
        | {
            Args: {
              p_filter_building_ids: string[]
              p_group_id: string
              p_member_ids: string[]
              p_session_dates: Json
            }
            Returns: Json
          }
        | {
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
      check_slug_availability: {
        Args: { exclude_id?: string; target_slug: string }
        Returns: boolean
      }
      claim_event: {
        Args: {
          p_event_id: string
          p_organiser_id?: string
          p_organiser_kind: string
        }
        Returns: Json
      }
      claim_person: { Args: { p_person_id: string }; Returns: Json }
      complete_ambassador_onboarding:
        | { Args: { p_contributor_type: string }; Returns: undefined }
        | { Args: { p_preferred_tools: string[] }; Returns: undefined }
      country_name_to_code: { Args: { p_country: string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      discover_companies: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          p_limit?: number
        }
        Returns: {
          claim_status: string
          country: string
          credit_count: number
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      discover_people: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          p_limit?: number
        }
        Returns: {
          avatar_url: string
          claim_status: string
          credit_count: number
          id: string
          name: string
          nationality: string
          slug: string
        }[]
      }
      dismiss_building_duplicate_pair: {
        Args: { p_id1: string; p_id2: string }
        Returns: undefined
      }
      dismiss_intervention_flag: {
        Args: {
          p_entity_id: string
          p_flag_type: string
          p_snooze_days?: number
        }
        Returns: undefined
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_nearby_buildings: {
        Args: {
          lat: number
          long: number
          name_query?: string
          radius_meters?: number
        }
        Returns: {
          address: string
          dist_meters: number
          id: string
          location_approximate: boolean
          location_lat: number
          location_lng: number
          main_image_url: string
          name: string
          short_id: number
          similarity_score: number
          slug: string
          tier_rank_label: string
        }[]
      }
      fix_orphaned_user_buildings: { Args: never; Returns: undefined }
      flag_building_credit: {
        Args: {
          p_credit_id: string
          p_notes: string
          p_reason: Database["public"]["Enums"]["credit_flag_reason_enum"]
        }
        Returns: Json
      }
      generate_credit_removal_token: {
        Args: { credit_id: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_admin_ambassador_locality_coverage: {
        Args: never
        Returns: {
          buildings_count: number
          chapter_id: string
          chapter_member_count: number
          chapter_name: string
          chapter_status: string
          city: string
          country: string
          country_code: string
          locality_id: string
        }[]
      }
      get_admin_ambassador_program_stats: {
        Args: never
        Returns: {
          chapters_active: number
          chapters_forming: number
          chapters_inactive: number
          members_by_country: Json
          pending_applications: number
          total_active_memberships: number
        }[]
      }
      get_admin_broadcasts: {
        Args: never
        Returns: {
          body: string
          id: string
          pinned: boolean
          read_count: number
          recipient_count: number
          recipient_scope: string
          scope_value: string
          sent_at: string
          sent_by_username: string
          subject: string
          type: string
        }[]
      }
      get_admin_content_stats: { Args: never; Returns: Json }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_leaderboards: { Args: never; Returns: Json }
      get_admin_notifications: { Args: never; Returns: Json }
      get_admin_pulse: { Args: never; Returns: Json }
      get_admin_retention: { Args: never; Returns: Json }
      get_admin_trends: { Args: never; Returns: Json }
      get_ambassador_badge_for_profile: {
        Args: { p_user_id: string }
        Returns: {
          ambassador_role: string
          chapter_name: string
        }[]
      }
      get_ambassador_broadcast_banners: {
        Args: never
        Returns: {
          body: string
          id: string
          is_pinned: boolean
          sent_at: string
          subject: string
          type: string
        }[]
      }
      get_ambassador_buildings_missing_metadata: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          city: string
          country: string
          has_architect_credit: boolean
          has_styles: boolean
          id: string
          name: string
          popularity_score: number
          short_id: number
          slug: string
          year_completed: number
        }[]
      }
      get_ambassador_buildings_without_photos: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          city: string
          country: string
          hero_image_url: string
          id: string
          name: string
          popularity_score: number
          short_id: number
          slug: string
        }[]
      }
      get_ambassador_moderation_credits: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string
          entity_name: string
          id: string
          role: string
        }[]
      }
      get_ambassador_moderation_photos: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          caption: string
          created_at: string
          id: string
          storage_path: string
        }[]
      }
      get_ambassador_moderation_videos: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          body: string
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string
          id: string
          title: string
          uploader_username: string
          video_url: string
        }[]
      }
      get_ambassador_my_audit_timeline: {
        Args: { p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string
          id: string
          operation: string
          table_name: string
        }[]
      }
      get_ambassador_recent_buildings: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          added_by_username: string
          address: string
          city: string
          country: string
          created_at: string
          hero_image_url: string
          id: string
          lat: number
          lng: number
          moderated_at: string
          moderated_by_username: string
          n: string
          name: string
          short_id: number
          slug: string
        }[]
      }
      get_ambassador_research_queue: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          current_values: Json
          data_points: Json
          id: string
          researched_at: string
          status: string
        }[]
      }
      get_ambassador_research_queue_candidates: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          address: string
          city: string
          context_count: number
          country: string
          current_access_cost: string
          current_access_level: string
          current_access_logistics: string
          current_access_notes: string
          current_alt_name: string
          current_category_name: string
          current_height_m: number
          current_size_sqm: number
          current_status: string
          current_storeys: number
          current_year_completed: number
          id: string
          materiality_count: number
          name: string
          popularity_score: number
          style_count: number
          typologies_count: number
        }[]
      }
      get_ambassador_unclaimed_firms: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          building_count: number
          claim_status: string
          country: string
          id: string
          name: string
          slug: string
        }[]
      }
      get_architect_claim_status: {
        Args: { p_architect_id: string }
        Returns: Json
      }
      get_award_leaderboard: {
        Args: { p_award_id?: string; p_limit?: number }
        Returns: {
          award_score: number
          building_id: string
          building_name: string
          building_slug: string
          city: string
          country: string
          finalist_count: number
          hero_image_url: string
          win_count: number
        }[]
      }
      get_broadcast_read_status: {
        Args: { p_broadcast_id: string }
        Returns: {
          chapter_id: string
          chapter_name: string
          president_user_id: string
          president_username: string
          read_at: string
        }[]
      }
      get_building_leaderboards: { Args: never; Returns: Json }
      get_building_reviews: {
        Args: {
          p_building_id: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          images: Json
          rating: number
          status: string
          tags: string[]
          user_data: Json
          user_id: string
          video_url: string
        }[]
      }
      get_building_top_links: {
        Args: { p_building_id: string; p_limit?: number }
        Returns: {
          like_count: number
          link_id: string
          title: string
          url: string
          user_avatar: string
          user_username: string
        }[]
      }
      get_buildings_in_collections: {
        Args: { p_collection_ids?: string[]; p_folder_ids?: string[] }
        Returns: {
          building_id: string
        }[]
      }
      get_buildings_list: {
        Args: {
          filter_criteria?: Json
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          page?: number
          page_size?: number
        }
        Returns: {
          alt_name: string
          city: string
          construction_status: string
          country: string
          credit_names: string[]
          id: string
          image_url: string
          lat: number
          lng: number
          locality_city_slug: string
          locality_country_code: string
          name: string
          popularity_score: number
          rating: number
          short_id: number
          slug: string
          status: string
          tier_rank: string
          year_completed: number
        }[]
      }
      get_buildings_missing_address: {
        Args: never
        Returns: {
          city: string
          country: string
          id: string
          lat: number
          lng: number
          name: string
        }[]
      }
      get_buildings_with_awards: {
        Args: {
          p_award_id?: string
          p_outcome?: string
          p_year_from?: number
          p_year_to?: number
        }
        Returns: {
          building_id: string
        }[]
      }
      get_chapter_ambassador_activity: {
        Args: { p_chapter_id: string; p_days?: number }
        Returns: {
          avatar_url: string
          edits_count: number
          firms_claimed_count: number
          last_active_at: string
          moderation_count: number
          outreach_count: number
          photos_added: number
          role: string
          total_score: number
          user_id: string
          username: string
          visits_count: number
        }[]
      }
      get_chapter_members_with_contact: {
        Args: { p_chapter_id: string }
        Returns: {
          avatar_url: string
          email: string
          exco_responsibility: string
          invited_by: string
          joined_at: string
          membership_id: string
          role: string
          status: string
          user_id: string
          username: string
        }[]
      }
      get_chapter_metrics: {
        Args: { p_chapter_id: string; p_days?: number }
        Returns: {
          period_end: string
          period_start: string
          prev_period_end: string
          prev_period_start: string
          prev_total_building_visits: number
          prev_total_edits: number
          prev_total_photos_added: number
          total_building_visits: number
          total_edits: number
          total_photos_added: number
        }[]
      }
      get_chapter_performance_ranking: {
        Args: { p_period_days?: number }
        Returns: {
          applications_approved: number
          chapter_id: string
          chapter_name: string
          chapter_type: string
          country_code: string
          edits: number
          last_activity_date: string
          member_count: number
          new_members: number
          photos_added: number
          score: number
        }[]
      }
      get_chapter_tasks: {
        Args: { p_chapter_id: string }
        Returns: {
          assigned_to: string
          assignee_avatar_url: string
          assignee_username: string
          company_id: string
          company_name: string
          created_at: string
          created_by: string
          creator_username: string
          description: string
          due_date: string
          id: string
          project_id: string
          project_title: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      get_chapter_team: {
        Args: { p_chapter_id: string }
        Returns: {
          avatar_url: string
          exco_responsibility: string
          joined_at: string
          role: string
          user_id: string
          username: string
        }[]
      }
      get_collection_buildings: {
        Args: { p_collection_id: string }
        Returns: {
          id: string
          lat: number
          lng: number
          name: string
        }[]
      }
      get_collection_stats: {
        Args: { collection_uuid: string }
        Returns: {
          building_id: string
          rating: number
          status: string
          user_id: string
        }[]
      }
      get_community_feed_ranked: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          building_data: Json
          building_id: string
          comments_count: number
          connectors: Json
          connectors_count: number
          content: string
          created_at: string
          edited_at: string
          freshness_hours: number
          id: string
          is_liked: boolean
          is_suggested: boolean
          likes_count: number
          location_match: string
          rating: number
          review_images: Json
          ring: number
          score: number
          status: string
          suggestion_reason: string
          tags: string[]
          user_data: Json
          user_id: string
          views_count: number
        }[]
      }
      get_discovery_feed: {
        Args: {
          p_architect_ids?: string[]
          p_attribute_ids?: string[]
          p_building_statuses?: string[]
          p_category_id?: string
          p_city_filter?: string
          p_contact_user_ids?: string[]
          p_country_code_filter?: string
          p_country_filter?: string
          p_credit_roles?: string[]
          p_limit: number
          p_locality_id?: string
          p_max_lat?: number
          p_max_lng?: number
          p_min_lat?: number
          p_min_lng?: number
          p_offset: number
          p_region_filter?: string
          p_typology_ids?: string[]
          p_user_id: string
        }
        Returns: {
          address: string
          city: string
          country: string
          id: string
          main_image_url: string
          name: string
          save_count: number
          short_id: number
          slug: string
          year_completed: number
        }[]
      }
      get_discovery_filters: { Args: never; Returns: Json }
      get_explorer_feed: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          backdrop_path: string
          id: string
          media_type: string
          overview: string
          poster_path: string
          recommender_avatar: string
          recommender_id: string
          recommender_username: string
          title: string
          tmdb_id: number
          trailer: string
        }[]
      }
      get_feed_ranked: {
        Args: { p_exclude_seen?: boolean; p_limit: number; p_offset: number }
        Returns: {
          building_data: Json
          building_id: string
          comments_count: number
          content: string
          created_at: string
          edited_at: string
          freshness_hours: number
          id: string
          is_liked: boolean
          likes_count: number
          rating: number
          review_images: Json
          ring: string
          score: number
          status: string
          tags: string[]
          user_data: Json
          user_id: string
          views_count: number
        }[]
      }
      get_global_moderation_buildings: {
        Args: { p_exclude_chapter_id: string; p_limit?: number }
        Returns: {
          added_by_username: string
          address: string
          city: string
          country: string
          created_at: string
          hero_image_url: string
          id: string
          lat: number
          lng: number
          moderated_at: string
          moderated_by_username: string
          n: string
          name: string
          short_id: number
          slug: string
        }[]
      }
      get_global_moderation_credits: {
        Args: { p_exclude_chapter_id: string; p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string
          entity_name: string
          id: string
          role: string
        }[]
      }
      get_global_moderation_photos: {
        Args: { p_exclude_chapter_id: string; p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          caption: string
          created_at: string
          id: string
          storage_path: string
        }[]
      }
      get_global_moderation_videos: {
        Args: { p_exclude_chapter_id: string; p_limit?: number }
        Returns: {
          body: string
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string
          id: string
          title: string
          uploader_username: string
          video_url: string
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
      get_inviter_facepile: {
        Args: { inviter_id: string }
        Returns: {
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_locality_collections: {
        Args: { p_limit?: number; p_locality_id: string }
        Returns: {
          building_count: number
          id: string
          name: string
          owner_avatar_url: string
          owner_username: string
          preview_image_urls: string[]
          slug: string
        }[]
      }
      get_locality_top_contributors: {
        Args: { p_limit?: number; p_locality_id: string }
        Returns: {
          avatar_url: string
          buildings_logged: number
          is_ambassador: boolean
          photos_uploaded: number
          reviews_written: number
          user_id: string
          username: string
        }[]
      }
      get_locality_volunteer_team: {
        Args: { p_locality_id: string }
        Returns: {
          avatar_url: string
          exco_responsibility: string
          role: string
          user_id: string
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
          building_id: string
          created_at: string
          id: string
          rating: number | null
          status: string
          user_id: string
          visited_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_buildings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_map_clusters:
        | {
            Args: {
              filters?: Json
              max_lat: number
              max_lng: number
              min_lat: number
              min_lng: number
              row_limit?: number
              zoom: number
            }
            Returns: {
              architect_names: string[]
              count: number
              id: string
              image_url: string
              is_cluster: boolean
              lat: number
              lng: number
              name: string
              popularity_score: number
              slug: string
              tier_rank: string
              winner_award_name: string
            }[]
          }
        | {
            Args: {
              filters?: Json
              max_lat: number
              max_lng: number
              min_lat: number
              min_lng: number
              zoom: number
            }
            Returns: {
              architect_names: string[]
              count: number
              id: string
              image_url: string
              is_cluster: boolean
              lat: number
              lng: number
              name: string
              slug: string
            }[]
          }
      get_map_clusters_v2: {
        Args: {
          filter_criteria?: Json
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          zoom_level: number
        }
        Returns: {
          count: number
          id: string
          image_url: string
          is_cluster: boolean
          lat: number
          lng: number
          max_tier: number
          name: string
          popularity_score: number
          slug: string
          status: string
          tier_rank: string
          winner_award_name: string
        }[]
      }
      get_map_clusters_v3: {
        Args: {
          filter_criteria?: Json
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          zoom_level: number
        }
        Returns: {
          city: string
          construction_status: string
          count: number
          id: string
          image_url: string
          is_cluster: boolean
          lat: number
          lng: number
          max_tier: number
          name: string
          photos_count: number
          popularity_score: number
          rating: number
          slug: string
          status: string
          tier_rank: string
          winner_award_name: string
        }[]
      }
      get_map_pins:
        | {
            Args: {
              filters?: Json
              location_coordinates?: Json
              p_limit?: number
              query_text?: string
              radius_meters?: number
            }
            Returns: {
              id: string
              is_candidate: boolean
              location_lat: number
              location_lng: number
              name: string
              status: string
            }[]
          }
        | {
            Args: {
              filters?: Json
              location_coordinates?: Json
              max_lat?: number
              max_lng?: number
              min_lat?: number
              min_lng?: number
              p_limit?: number
              query_text?: string
              radius_meters?: number
            }
            Returns: {
              id: string
              is_candidate: boolean
              location_lat: number
              location_lng: number
              name: string
              status: string
            }[]
          }
      get_my_ambassador_goals: {
        Args: never
        Returns: {
          created_at: string
          current_value: number
          due_date: string
          id: string
          metric: string
          status: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_group_ids: { Args: never; Returns: string[] }
      get_national_chapter_overview: {
        Args: { p_national_chapter_id: string }
        Returns: {
          chapter_id: string
          chapter_name: string
          edits_last_30d: number
          last_activity_at: string
          locality_id: string
          member_count: number
          photos_last_30d: number
          president_name: string
        }[]
      }
      get_people_you_may_know: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          group_mutual_count: number
          id: string
          is_follows_me: boolean
          mutual_count: number
          username: string
        }[]
      }
      get_person_award_leaderboard: {
        Args: { p_award_id?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          award_count: number
          person_id: string
          person_name: string
          person_slug: string
          win_count: number
        }[]
      }
      get_photo_coverage_stats: {
        Args: never
        Returns: {
          buildings_with_photos: number
          buildings_without_photos: number
          total_buildings: number
          total_photos: number
        }[]
      }
      get_photo_heatmap_data: {
        Args: never
        Returns: {
          lat: number
          lng: number
          weight: number
        }[]
      }
      get_potential_duplicate_buildings: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          id1: string
          id2: string
          name1: string
          name2: string
          score: number
        }[]
      }
      get_potential_duplicates: {
        Args: { limit_count?: number; similarity_threshold?: number }
        Returns: {
          id1: string
          id2: string
          name1: string
          name2: string
          score: number
        }[]
      }
      get_president_directory: {
        Args: never
        Returns: {
          chapter_id: string
          chapter_name: string
          chapter_status: string
          country_code: string
          edits_30d: number
          exco_members: Json
          last_active_at: string
          member_count: number
          member_since: string
          open_applications: number
          president_avatar_url: string
          president_user_id: string
          president_username: string
        }[]
      }
      get_president_onboarding_list: {
        Args: never
        Returns: {
          chapter_id: string
          chapter_name: string
          country_code: string
          days_in_role: number
          last_active_at: string
          membership_id: string
          president_avatar_url: string
          president_user_id: string
          president_username: string
          steps_completed: number
        }[]
      }
      get_president_onboarding_status: {
        Args: { p_membership_id: string }
        Returns: Json
      }
      get_programme_health_summary: { Args: never; Returns: Json }
      get_programme_intervention_flags: {
        Args: never
        Returns: {
          chapter_id: string
          chapter_name: string
          country_code: string
          description: string
          detected_at: string
          flag_type: string
          severity: string
          suggested_action: string
        }[]
      }
      get_top_photo_buildings: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          country_code: string
          id: string
          lat: number
          lng: number
          name: string
          photo_count: number
          slug: string
        }[]
      }
      get_user_ambassador_membership: {
        Args: never
        Returns: {
          chapter_id: string
          contributor_type: string | null
          created_at: string
          exco_responsibility: string | null
          id: string
          invited_by: string | null
          joined_at: string
          onboarded_at: string | null
          preferred_tools: string[] | null
          role: string
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ambassador_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_tags: {
        Args: { p_user_id: string }
        Returns: {
          tag: string
        }[]
      }
      get_zero_photo_buildings: {
        Args: { p_limit?: number }
        Returns: {
          city: string
          country_code: string
          id: string
          lat: number
          lng: number
          name: string
          slug: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_embassy_portal_access: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_ambassador: { Args: never; Returns: boolean }
      is_chapter_leader: { Args: { p_chapter_id: string }; Returns: boolean }
      is_chapter_president: { Args: { p_chapter_id: string }; Returns: boolean }
      is_collection_admin: {
        Args: { _collection_id: string }
        Returns: boolean
      }
      is_collection_contributor: {
        Args: { _collection_id: string }
        Returns: boolean
      }
      is_group_admin: { Args: { check_group_id: string }; Returns: boolean }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_mutual: { Args: { user_a: string; user_b: string }; Returns: boolean }
      is_mutual_contact: {
        Args: { user_id_a: string; user_id_b: string }
        Returns: boolean
      }
      is_national_president_of_local_chapter_parent: {
        Args: { p_chapter_id: string }
        Returns: boolean
      }
      is_user_verified_architect: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_verified_architect_for_building: {
        Args: { building_uuid: string; user_uuid: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      main_image_url: {
        Args: { b: Database["public"]["Tables"]["buildings"]["Row"] }
        Returns: string
      }
      make_city_slug: { Args: { p_city: string }; Returns: string }
      make_locality_slug: {
        Args: { p_city: string; p_country_code: string }
        Returns: string
      }
      mark_broadcast_read: {
        Args: { p_broadcast_id: string }
        Returns: undefined
      }
      merge_buildings: {
        Args: { source_id: string; target_id: string }
        Returns: undefined
      }
      migrate_tags_to_collections: { Args: never; Returns: undefined }
      plano_auth_is_award_admin: {
        Args: { p_award_id: string }
        Returns: boolean
      }
      plano_auth_is_award_admin_for_recipient: {
        Args: { p_edition_id: string }
        Returns: boolean
      }
      plano_auth_is_company_steward: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      president_invite_ambassador_member: {
        Args: {
          p_chapter_id: string
          p_exco_responsibility?: string
          p_role: string
          p_user_id: string
        }
        Returns: string
      }
      president_update_chapter_membership: {
        Args: {
          p_exco_responsibility?: string
          p_membership_id: string
          p_role: string
          p_status?: string
        }
        Returns: undefined
      }
      redeem_company_claim_token: {
        Args: { p_token_hex: string }
        Returns: Json
      }
      redeem_company_steward_invite: {
        Args: { p_token_hex: string }
        Returns: Json
      }
      redeem_credit_removal_token: {
        Args: { p_token_hex: string }
        Returns: Json
      }
      refresh_locality_hero_images: { Args: never; Returns: undefined }
      reject_company_steward_request_by_id: {
        Args: { p_request_id: string }
        Returns: Json
      }
      reopen_feedback: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      request_collection_collaboration: {
        Args: { p_collection_id: string; p_message?: string }
        Returns: string
      }
      resolve_locality_for_explore: {
        Args: { p_city: string; p_country_code: string }
        Returns: string
      }
      revert_building_change: { Args: { log_id: string }; Returns: undefined }
      review_ambassador_application:
        | {
            Args: {
              p_application_id: string
              p_approve: boolean
              p_reviewer_note?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_application_id: string
              p_approve: boolean
              p_chapter_id?: string
              p_reviewer_note?: string
            }
            Returns: undefined
          }
      review_award_claim_request: {
        Args: {
          p_approve: boolean
          p_request_id: string
          p_reviewer_note?: string
        }
        Returns: Json
      }
      review_collection_collaboration: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: undefined
      }
      search_buildings:
        | {
            Args: {
              p_architects?: string[]
              p_bucket_list_user_id?: string
              p_limit?: number
              p_min_rating?: number
              p_not_visited_by_user_id?: string
              p_offset?: number
              p_query?: string
              p_rated_by_user_ids?: string[]
              p_styles?: string[]
              p_visited_by_user_id?: string
              p_year_max?: number
              p_year_min?: number
            }
            Returns: {
              address: string
              architects: string[]
              avg_rating: number
              id: string
              main_image_url: string
              name: string
              styles: string[]
              visit_count: number
              year_completed: number
            }[]
          }
        | {
            Args: {
              filters?: Json
              p_access_costs?: string[]
              p_access_levels?: string[]
              p_access_logistics?: string[]
              p_lat?: number
              p_limit?: number
              p_lng?: number
              query_text?: string
              radius_meters?: number
              sort_by?: string
            }
            Returns: {
              address: string
              city: string
              country: string
              credited_entities: Json
              distance_meters: number
              id: string
              location_lat: number
              location_lng: number
              location_precision: Database["public"]["Enums"]["location_precision"]
              name: string
              social_context: string
              social_score: number
              styles: Json
              visitors: Json
              year_completed: number
            }[]
          }
      search_buildings_v2: {
        Args: {
          p_filters?: Json
          p_limit?: number
          p_offset?: number
          p_query: string
        }
        Returns: {
          alt_name: string
          city: string
          construction_status: string
          country: string
          credit_names: string[]
          hero_image_url: string
          id: string
          lat: number
          lng: number
          locality_city_slug: string
          locality_country_code: string
          name: string
          popularity_score: number
          rank_score: number
          short_id: number
          slug: string
          tier_rank: string
          year_completed: number
        }[]
      }
      search_companies_v2: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          claim_status: string
          country: string
          credit_count: number
          id: string
          logo_url: string
          name: string
          rank_score: number
          slug: string
        }[]
      }
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
      search_people_v2: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          claim_status: string
          credit_count: number
          id: string
          name: string
          nationality: string
          rank_score: number
          slug: string
        }[]
      }
      send_admin_broadcast: {
        Args: {
          p_body: string
          p_recipient_scope: string
          p_scope_value?: string
          p_subject: string
          p_type: string
        }
        Returns: string
      }
      send_session_reminders: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_person_name: { Args: { raw: string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      stamp_chapter_last_event_search_at: {
        Args: { p_chapter_id: string }
        Returns: undefined
      }
      submit_ambassador_application:
        | {
            Args: {
              p_chapter_id?: string
              p_interests?: string[]
              p_locality_id?: string
              p_motivation_text?: string
            }
            Returns: string
          }
        | {
            Args: { p_chapter_id: string; p_motivation_text: string }
            Returns: string
          }
      submit_award_claim_request: {
        Args: { p_award_id: string; p_reason: string }
        Returns: Json
      }
      sync_ambassador_membership_after_profile_geography: {
        Args: never
        Returns: Json
      }
      toggle_broadcast_pin: {
        Args: { p_broadcast_id: string; p_pinned: boolean }
        Returns: undefined
      }
      track_login: { Args: never; Returns: undefined }
      track_note_views: { Args: { p_note_ids: string[] }; Returns: undefined }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_building_community_preview: {
        Args: { p_building_id: string }
        Returns: undefined
      }
      update_building_tiers: { Args: never; Returns: undefined }
      update_group_stats: {
        Args: { target_group_id: string }
        Returns: undefined
      }
      update_presence: { Args: never; Returns: undefined }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      award_edition_event_type:
        | "nominations_open"
        | "nominations_close"
        | "longlist_announcement"
        | "shortlist_announcement"
        | "winner_announcement"
        | "ceremony"
        | "other"
      building_access:
        | "Open Access"
        | "Admission Fee"
        | "Customers Only"
        | "Appointment Only"
        | "Exterior View Only"
        | "No Access"
      building_access_cost: "free" | "paid" | "customers_only"
      building_access_level: "public" | "private" | "restricted" | "commercial"
      building_access_logistics:
        | "walk-in"
        | "booking_required"
        | "tour_only"
        | "exterior_only"
      building_status:
        | "Built"
        | "Under Construction"
        | "Unbuilt"
        | "Demolished"
        | "Temporary"
        | "Lost"
      building_tier_rank:
        | "Top 1%"
        | "Top 5%"
        | "Top 10%"
        | "Top 25%"
        | "Top 20%"
        | "Standard"
      company_claim_dispute_status: "open" | "resolved"
      company_steward_request_status: "pending" | "approved" | "rejected"
      company_steward_role: "owner" | "steward"
      credit_flag_reason_enum:
        | "wrong_person"
        | "never_involved"
        | "wrong_role"
        | "other"
      credit_role_enum:
        | "design_architecture"
        | "architecture_of_record"
        | "executive_architecture"
        | "interior_architecture"
        | "landscape_architecture"
        | "urban_design"
        | "conservation_architecture"
        | "structural_engineering"
        | "mep_engineering"
        | "civil_engineering"
        | "geotechnical_engineering"
        | "facade_engineering"
        | "wind_consultancy"
        | "acoustic_consultancy"
        | "fire_engineering"
        | "lighting_design"
        | "development"
        | "main_contracting"
        | "project_management"
        | "cost_consultancy"
        | "planning_consultancy"
        | "graphic_wayfinding_design"
        | "art_consultancy"
        | "sustainability_consultancy"
        | "heritage_consultancy"
        | "other"
      credit_status_enum: "active" | "verified" | "flagged" | "hidden"
      credit_tier_enum: "primary" | "contributor" | "ancillary"
      event_attendance_status: "interested" | "going"
      event_claim_status: "unclaimed" | "pending" | "claimed"
      feedback_status:
        | "open"
        | "in_review"
        | "testing"
        | "resolved"
        | "wont_fix"
        | "duplicate"
        | "backlog"
      location_precision: "exact" | "approximate"
      person_claim_status: "unclaimed" | "claimed" | "verified"
      poll_status:
        | "draft"
        | "open"
        | "closed"
        | "archived"
        | "live"
        | "published"
      poll_type: "general" | "film_selection" | "quiz"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      award_edition_event_type: [
        "nominations_open",
        "nominations_close",
        "longlist_announcement",
        "shortlist_announcement",
        "winner_announcement",
        "ceremony",
        "other",
      ],
      building_access: [
        "Open Access",
        "Admission Fee",
        "Customers Only",
        "Appointment Only",
        "Exterior View Only",
        "No Access",
      ],
      building_access_cost: ["free", "paid", "customers_only"],
      building_access_level: ["public", "private", "restricted", "commercial"],
      building_access_logistics: [
        "walk-in",
        "booking_required",
        "tour_only",
        "exterior_only",
      ],
      building_status: [
        "Built",
        "Under Construction",
        "Unbuilt",
        "Demolished",
        "Temporary",
        "Lost",
      ],
      building_tier_rank: [
        "Top 1%",
        "Top 5%",
        "Top 10%",
        "Top 25%",
        "Top 20%",
        "Standard",
      ],
      company_claim_dispute_status: ["open", "resolved"],
      company_steward_request_status: ["pending", "approved", "rejected"],
      company_steward_role: ["owner", "steward"],
      credit_flag_reason_enum: [
        "wrong_person",
        "never_involved",
        "wrong_role",
        "other",
      ],
      credit_role_enum: [
        "design_architecture",
        "architecture_of_record",
        "executive_architecture",
        "interior_architecture",
        "landscape_architecture",
        "urban_design",
        "conservation_architecture",
        "structural_engineering",
        "mep_engineering",
        "civil_engineering",
        "geotechnical_engineering",
        "facade_engineering",
        "wind_consultancy",
        "acoustic_consultancy",
        "fire_engineering",
        "lighting_design",
        "development",
        "main_contracting",
        "project_management",
        "cost_consultancy",
        "planning_consultancy",
        "graphic_wayfinding_design",
        "art_consultancy",
        "sustainability_consultancy",
        "heritage_consultancy",
        "other",
      ],
      credit_status_enum: ["active", "verified", "flagged", "hidden"],
      credit_tier_enum: ["primary", "contributor", "ancillary"],
      event_attendance_status: ["interested", "going"],
      event_claim_status: ["unclaimed", "pending", "claimed"],
      feedback_status: [
        "open",
        "in_review",
        "testing",
        "resolved",
        "wont_fix",
        "duplicate",
        "backlog",
      ],
      location_precision: ["exact", "approximate"],
      person_claim_status: ["unclaimed", "claimed", "verified"],
      poll_status: ["draft", "open", "closed", "archived", "live", "published"],
      poll_type: ["general", "film_selection", "quiz"],
    },
  },
} as const
