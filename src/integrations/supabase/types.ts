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
      ambassador_chapters: {
        Row: {
          country_code: string
          created_at: string
          id: string
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
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_applications: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          motivation_text: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          motivation_text: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          motivation_text?: string
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
            foreignKeyName: "building_credits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      building_credit_notes: {
        Row: {
          id: string
          credit_id: string
          user_id: string
          content: string
          image_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          credit_id: string
          user_id: string
          content: string
          image_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          credit_id?: string
          user_id?: string
          content?: string
          image_urls?: string[]
          created_at?: string
          updated_at?: string
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
          id: string
          user_id: string
          building_id: string
          title: string | null
          body: string | null
          tags: string[] | null
          video_url: string | null
          visibility: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          building_id: string
          title?: string | null
          body?: string | null
          tags?: string[] | null
          video_url?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          building_id?: string
          title?: string | null
          body?: string | null
          tags?: string[] | null
          video_url?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_posts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
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
          name: string
          popularity_score: number
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
          name: string
          popularity_score?: number
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
          name?: string
          popularity_score?: number
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
          claim_status: Database["public"]["Enums"]["event_claim_status"]
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_at: string | null
          external_link: string | null
          id: string
          is_deleted: boolean
          is_self_hosted: boolean
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
          claim_status?: Database["public"]["Enums"]["event_claim_status"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          is_deleted?: boolean
          is_self_hosted?: boolean
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
          claim_status?: Database["public"]["Enums"]["event_claim_status"]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          external_link?: string | null
          id?: string
          is_deleted?: boolean
          is_self_hosted?: boolean
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
          hero_image_url: string | null
          id: string
          lat: number | null
          lng: number | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          buildings_count?: number
          city: string
          city_slug?: string
          country: string
          country_code: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          meta_description?: string | null
          meta_title?: string | null
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
          hero_image_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          meta_description?: string | null
          meta_title?: string | null
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
            referencedRelation: "people"
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
          review_id?: string
          storage_path?: string
          user_id?: string
          width_px?: number | null
        }
        Relationships: [
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
      complete_ambassador_onboarding: {
        Args: { p_preferred_tools: string[] }
        Returns: undefined
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
      admin_merge_people: {
        Args: { p_source_person_id: string; p_target_person_id: string }
        Returns: Json
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
          p_organiser_kind: string
          p_organiser_id?: string
        }
        Returns: Json
      }
      claim_person: { Args: { p_person_id: string }; Returns: Json }
      country_name_to_code: { Args: { p_country: string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
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
      find_nearby_buildings:
        | {
            Args: { lat: number; long: number; radius_meters?: number }
            Returns: {
              address: string
              dist_meters: number
              id: string
              location_lat: number
              location_lng: number
              main_image_url: string
              name: string
              short_id: number
              similarity_score: number
              slug: string
            }[]
          }
        | {
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
              location_lat: number
              location_lng: number
              main_image_url: string
              name: string
              short_id: number
              similarity_score: number
              slug: string
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
      get_admin_content_stats: { Args: never; Returns: Json }
      get_ambassador_badge_for_profile: {
        Args: { p_user_id: string }
        Returns: {
          ambassador_role: string
          chapter_name: string
        }[]
      }
      get_ambassador_buildings_missing_metadata: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          city: string | null
          country: string | null
          has_architect_credit: boolean
          has_styles: boolean
          id: string
          name: string
          popularity_score: number
          short_id: number
          slug: string
          year_completed: number | null
        }[]
      }
      get_ambassador_buildings_without_photos: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          city: string | null
          country: string | null
          hero_image_url: string | null
          id: string
          name: string
          popularity_score: number
          short_id: number
          slug: string
        }[]
      }
      get_ambassador_my_audit_timeline: {
        Args: { p_limit?: number }
        Returns: {
          building_id: string
          building_name: string
          building_short_id: number
          building_slug: string
          created_at: string | null
          id: string
          operation: string
          table_name: string
        }[]
      }
      get_ambassador_recent_buildings: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          added_by_username: string | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          hero_image_url: string | null
          id: string
          lat: number | null
          lng: number | null
          n: string | null
          name: string
          short_id: number
          slug: string
        }[]
      }
      get_ambassador_unclaimed_firms: {
        Args: { p_chapter_id: string; p_limit?: number }
        Returns: {
          building_count: number
          claim_status: string
          country: string | null
          id: string
          name: string
          slug: string
        }[]
      }
      get_chapter_ambassador_activity: {
        Args: { p_chapter_id: string; p_days?: number }
        Returns: {
          avatar_url: string | null
          edits_count: number
          last_active_at: string | null
          photos_added: number
          role: string
          user_id: string
          username: string
        }[]
      }
      get_chapter_members_with_contact: {
        Args: { p_chapter_id: string }
        Returns: {
          avatar_url: string | null
          email: string
          exco_responsibility: string | null
          joined_at: string
          invited_by: string | null
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
      president_invite_ambassador_member: {
        Args: {
          p_chapter_id: string
          p_exco_responsibility?: string | null
          p_role: string
          p_user_id: string
        }
        Returns: string
      }
      president_update_chapter_membership: {
        Args: {
          p_exco_responsibility?: string | null
          p_membership_id: string
          p_role?: string | null
          p_status?: string | null
        }
        Returns: undefined
      }
      get_national_chapter_overview: {
        Args: { p_national_chapter_id: string }
        Returns: {
          chapter_id: string
          chapter_name: string
          edits_last_30d: number
          last_activity_at: string | null
          locality_id: string | null
          member_count: number
          photos_last_30d: number
          president_name: string
        }[]
      }
      get_admin_ambassador_locality_coverage: {
        Args: Record<PropertyKey, never>
        Returns: {
          buildings_count: number
          chapter_id: string | null
          chapter_member_count: number
          chapter_name: string | null
          chapter_status: string | null
          city: string
          country: string
          country_code: string
          locality_id: string
        }[]
      }
      get_admin_ambassador_program_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          chapters_active: number
          chapters_forming: number
          chapters_inactive: number
          members_by_country: Json
          pending_applications: number
          total_active_memberships: number
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_leaderboards: { Args: never; Returns: Json }
      get_admin_notifications: { Args: never; Returns: Json }
      get_admin_pulse: { Args: never; Returns: Json }
      get_admin_retention: { Args: never; Returns: Json }
      get_admin_trends: { Args: never; Returns: Json }
      get_architect_claim_status: {
        Args: { p_architect_id: string }
        Returns: Json
      }
      get_building_leaderboards: { Args: never; Returns: Json }
      get_building_reviews: {
        Args: { p_building_id: string }
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
          country: string
          credit_names: string[]
          id: string
          image_url: string
          lat: number
          lng: number
          name: string
          popularity_score: number
          rating: number
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
      get_collections_feed: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          building_count: number
          description: string
          id: string
          name: string
          owner: Json
          owner_id: string
          preview_buildings: Json
          primary_tag: string
          slug: string
          updated_at: string
        }[]
      }
      get_discovery_feed:
        | {
            Args: {
              p_city_filter?: string
              p_limit: number
              p_offset: number
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
              slug: string
              year_completed: number
            }[]
          }
        | {
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
      get_feed: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          building_data: Json
          building_id: string
          comments_count: number
          content: string
          created_at: string
          edited_at: string
          id: string
          is_liked: boolean
          likes_count: number
          rating: number
          review_images: Json
          status: string
          tags: string[]
          user_data: Json
          user_id: string
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
      get_main_feed: {
        Args: {
          p_limit: number
          p_offset: number
          p_show_group_activity: boolean
        }
        Returns: {
          building_id: string
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          rating: number | null
          status: string
          tags: string[] | null
          user_id: string
          video_url: string | null
          visibility: string | null
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
      get_my_group_ids: { Args: never; Returns: string[] }
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
      get_photo_heatmap_data: {
        Args: never
        Returns: {
          lat: number
          lng: number
          weight: number
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
      get_suggested_posts: {
        Args: { p_limit: number; p_offset: number }
        Returns: {
          building_data: Json
          building_id: string
          comments_count: number
          content: string
          created_at: string
          edited_at: string
          id: string
          is_liked: boolean
          is_suggested: boolean
          likes_count: number
          rating: number
          status: string
          suggestion_reason: string
          tags: string[]
          user_data: Json
          user_id: string
        }[]
      }
      get_user_tags: {
        Args: { p_user_id: string }
        Returns: {
          tag: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_ambassador: { Args: never; Returns: boolean }
      has_embassy_portal_access: { Args: never; Returns: boolean }
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
      is_verified_architect_for_building: {
        Args: { building_uuid: string; user_uuid: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      main_image_url: {
        Args: { b: Database["public"]["Tables"]["buildings"]["Row"] }
        Returns: string
      }
      make_locality_slug: {
        Args: { p_city: string; p_country_code: string }
        Returns: string
      }
      merge_buildings: {
        Args: { source_id: string; target_id: string }
        Returns: undefined
      }
      migrate_tags_to_collections: { Args: never; Returns: undefined }
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
      reject_company_steward_request_by_id: {
        Args: { p_request_id: string }
        Returns: Json
      }
      resolve_locality_for_explore: {
        Args: { p_city: string; p_country_code: string }
        Returns: string | null
      }
      review_ambassador_application: {
        Args: {
          p_application_id: string
          p_approve: boolean
          p_reviewer_note?: string | null
          p_chapter_id?: string | null
        }
        Returns: undefined
      }
      revert_building_change: { Args: { log_id: string }; Returns: undefined }
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
      send_session_reminders: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_person_name: { Args: { raw: string }; Returns: string }
      sync_ambassador_membership_after_profile_geography: {
        Args: never
        Returns: Json
      }
      submit_ambassador_application: {
        Args: { p_chapter_id: string; p_motivation_text: string }
        Returns: string
      }
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
      track_login: { Args: never; Returns: undefined }
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
      location_precision: ["exact", "approximate"],
      person_claim_status: ["unclaimed", "claimed", "verified"],
      poll_status: ["draft", "open", "closed", "archived", "live", "published"],
      poll_type: ["general", "film_selection", "quiz"],
    },
  },
} as const
