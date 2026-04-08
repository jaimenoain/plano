/**
 * Plano building-domain tables and admin RPCs not present in the legacy generated
 * snapshot. Merged into Database in `./types.ts`.
 *
 * After `npm run gen-types`, if the live project includes these objects, they may
 * duplicate — remove this merge once `types.ts` is fully generated from Plano DB only.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Loose RPC args so client call sites typecheck without mirroring every SQL signature. */
type RpcArgs = {
  [key: string]: Json | string | number | boolean | null | undefined
}

export type PlanoPublicTables = {
  admin_audit_logs: {
    Row: {
      id: string
      created_at: string
      admin_id: string
      action_type: string
      target_type: string | null
      target_id: string | null
      details: Json | null
    }
    Insert: {
      id?: string
      created_at?: string
      admin_id: string
      action_type: string
      target_type?: string | null
      target_id?: string | null
      details?: Json | null
    }
    Update: {
      id?: string
      created_at?: string
      admin_id?: string
      action_type?: string
      target_type?: string | null
      target_id?: string | null
      details?: Json | null
    }
    Relationships: []
  }
  architect_affiliations: {
    Row: {
      studio_id: string
      individual_id: string
      created_at: string
    }
    Insert: {
      studio_id: string
      individual_id: string
      created_at?: string
    }
    Update: {
      studio_id?: string
      individual_id?: string
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "architect_affiliations_studio_id_fkey"
        columns: ["studio_id"]
        isOneToOne: false
        referencedRelation: "architects"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "architect_affiliations_individual_id_fkey"
        columns: ["individual_id"]
        isOneToOne: false
        referencedRelation: "architects"
        referencedColumns: ["id"]
      },
    ]
  }
  architect_claims: {
    Row: {
      id: string
      user_id: string
      architect_id: string
      status: string
      proof_email: string
      created_at: string
      resolved_at: string | null
    }
    Insert: {
      id?: string
      user_id: string
      architect_id: string
      status?: string
      proof_email: string
      created_at?: string
      resolved_at?: string | null
    }
    Update: {
      id?: string
      user_id?: string
      architect_id?: string
      status?: string
      proof_email?: string
      created_at?: string
      resolved_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "architect_claims_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "architect_claims_architect_id_fkey"
        columns: ["architect_id"]
        isOneToOne: false
        referencedRelation: "architects"
        referencedColumns: ["id"]
      },
    ]
  }
  architects: {
    Row: {
      id: string
      name: string
      type: string
      headquarters: string | null
      website_url: string | null
      bio: string | null
      nationality: string | null
      created_at: string | null
    }
    Insert: {
      id?: string
      name: string
      type: string
      headquarters?: string | null
      website_url?: string | null
      bio?: string | null
      nationality?: string | null
      created_at?: string | null
    }
    Update: {
      id?: string
      name?: string
      type?: string
      headquarters?: string | null
      website_url?: string | null
      bio?: string | null
      nationality?: string | null
      created_at?: string | null
    }
    Relationships: []
  }
  people: {
    Row: {
      id: string
      name: string
      slug: string
      bio: string | null
      nationality: string | null
      birth_year: number | null
      death_year: number | null
      avatar_url: string | null
      website: string | null
      location_note: string | null
      claimed_by_user_id: string | null
      claim_status: string
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      name: string
      slug: string
      bio?: string | null
      nationality?: string | null
      birth_year?: number | null
      death_year?: number | null
      avatar_url?: string | null
      website?: string | null
      location_note?: string | null
      claimed_by_user_id?: string | null
      claim_status?: string
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      bio?: string | null
      nationality?: string | null
      birth_year?: number | null
      death_year?: number | null
      avatar_url?: string | null
      website?: string | null
      location_note?: string | null
      claimed_by_user_id?: string | null
      claim_status?: string
      created_at?: string
      updated_at?: string
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
  architectural_styles: {
    Row: {
      id: string
      name: string
      slug: string
      created_at: string | null
    }
    Insert: {
      id?: string
      name: string
      slug: string
      created_at?: string | null
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      created_at?: string | null
    }
    Relationships: []
  }
  attribute_groups: {
    Row: {
      id: string
      name: string
      slug: string
      sort_order: number | null
      created_at: string | null
    }
    Insert: {
      id?: string
      name: string
      slug: string
      sort_order?: number | null
      created_at?: string | null
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      sort_order?: number | null
      created_at?: string | null
    }
    Relationships: []
  }
  attributes: {
    Row: {
      id: string
      group_id: string
      name: string
      slug: string
      sort_order: number | null
      created_at: string | null
    }
    Insert: {
      id?: string
      group_id: string
      name: string
      slug: string
      sort_order?: number | null
      created_at?: string | null
    }
    Update: {
      id?: string
      group_id?: string
      name?: string
      slug?: string
      sort_order?: number | null
      created_at?: string | null
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
  building_architects: {
    Row: {
      building_id: string
      architect_id: string
    }
    Insert: {
      building_id: string
      architect_id: string
    }
    Update: {
      building_id?: string
      architect_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "building_architects_building_id_fkey"
        columns: ["building_id"]
        isOneToOne: false
        referencedRelation: "buildings"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "building_architects_architect_id_fkey"
        columns: ["architect_id"]
        isOneToOne: false
        referencedRelation: "architects"
        referencedColumns: ["id"]
      },
    ]
  }
  buildings: {
    Row: {
      id: string
      name: string
      location: unknown
      address: string | null
      city: string | null
      country: string | null
      main_image_url: string | null
      hero_image_id: string | null
      hero_image_url: string | null
      community_preview_url: string | null
      slug: string | null
      short_id: number | null
      year_completed: number | null
      created_by: string | null
      created_at: string | null
      is_deleted: boolean | null
      is_verified: boolean | null
      status: string | null
      access_level: string | null
      access_logistics: string | null
      access_cost: string | null
      access_notes: string | null
      typology: string[] | null
      materials: string[] | null
      context: string | null
      intervention: string | null
      category: string | null
      functional_category_id: string | null
      architect_statement: string | null
      location_precision: string | null
      tier_rank: string | null
      popularity_score: number | null
      alt_name: string | null
      aliases: string[] | null
    }
    Insert: {
      id?: string
      name: string
      location?: unknown
      address?: string | null
      city?: string | null
      country?: string | null
      main_image_url?: string | null
      hero_image_id?: string | null
      hero_image_url?: string | null
      community_preview_url?: string | null
      slug?: string | null
      short_id?: number | null
      year_completed?: number | null
      created_by?: string | null
      created_at?: string | null
      is_deleted?: boolean | null
      is_verified?: boolean | null
      status?: string | null
      access_level?: string | null
      access_logistics?: string | null
      access_cost?: string | null
      access_notes?: string | null
      typology?: string[] | null
      materials?: string[] | null
      context?: string | null
      intervention?: string | null
      category?: string | null
      functional_category_id?: string | null
      architect_statement?: string | null
      location_precision?: string | null
      tier_rank?: string | null
      popularity_score?: number | null
      alt_name?: string | null
      aliases?: string[] | null
    }
    Update: {
      id?: string
      name?: string
      location?: unknown
      address?: string | null
      city?: string | null
      country?: string | null
      main_image_url?: string | null
      hero_image_id?: string | null
      hero_image_url?: string | null
      community_preview_url?: string | null
      slug?: string | null
      short_id?: number | null
      year_completed?: number | null
      created_by?: string | null
      created_at?: string | null
      is_deleted?: boolean | null
      is_verified?: boolean | null
      status?: string | null
      access_level?: string | null
      access_logistics?: string | null
      access_cost?: string | null
      access_notes?: string | null
      typology?: string[] | null
      materials?: string[] | null
      context?: string | null
      intervention?: string | null
      category?: string | null
      functional_category_id?: string | null
      architect_statement?: string | null
      location_precision?: string | null
      tier_rank?: string | null
      popularity_score?: number | null
      alt_name?: string | null
      aliases?: string[] | null
    }
    Relationships: []
  }
  building_styles: {
    Row: {
      building_id: string
      style_id: string
      created_at: string | null
    }
    Insert: {
      building_id: string
      style_id: string
      created_at?: string | null
    }
    Update: {
      building_id?: string
      style_id?: string
      created_at?: string | null
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
  building_attributes: {
    Row: {
      building_id: string
      attribute_id: string
    }
    Insert: {
      building_id: string
      attribute_id: string
    }
    Update: {
      building_id?: string
      attribute_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "building_attributes_building_id_fkey"
        columns: ["building_id"]
        isOneToOne: false
        referencedRelation: "buildings"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "building_attributes_attribute_id_fkey"
        columns: ["attribute_id"]
        isOneToOne: false
        referencedRelation: "attributes"
        referencedColumns: ["id"]
      },
    ]
  }
  building_audit_logs: {
    Row: {
      id: string
      building_id: string
      user_id: string | null
      table_name: string
      operation: string
      old_data: Json | null
      new_data: Json | null
      created_at: string | null
    }
    Insert: {
      id?: string
      building_id: string
      user_id?: string | null
      table_name: string
      operation: string
      old_data?: Json | null
      new_data?: Json | null
      created_at?: string | null
    }
    Update: {
      id?: string
      building_id?: string
      user_id?: string | null
      table_name?: string
      operation?: string
      old_data?: Json | null
      new_data?: Json | null
      created_at?: string | null
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
  collection_contributors: {
    Row: {
      id: string
      collection_id: string
      user_id: string
      role: string | null
      created_at: string | null
    }
    Insert: {
      id?: string
      collection_id: string
      user_id: string
      role?: string | null
      created_at?: string | null
    }
    Update: {
      id?: string
      collection_id?: string
      user_id?: string
      role?: string | null
      created_at?: string | null
    }
    Relationships: []
  }
  collection_favorites: {
    Row: {
      collection_id: string
      user_id: string
      created_at: string | null
    }
    Insert: {
      collection_id: string
      user_id: string
      created_at?: string | null
    }
    Update: {
      collection_id?: string
      user_id?: string
      created_at?: string | null
    }
    Relationships: []
  }
  comments: {
    Row: {
      id: string
      content: string
      created_at: string
      user_id: string
      interaction_id: string
    }
    Insert: {
      id?: string
      content: string
      created_at?: string
      user_id: string
      interaction_id: string
    }
    Update: {
      id?: string
      content?: string
      created_at?: string
      user_id?: string
      interaction_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "comments_user_building_id_fkey"
        columns: ["interaction_id"]
        isOneToOne: false
        referencedRelation: "user_buildings"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "comments_new_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
    ]
  }
  likes: {
    Row: {
      id: string
      created_at: string
      interaction_id: string
      user_id: string
    }
    Insert: {
      id?: string
      created_at?: string
      interaction_id: string
      user_id: string
    }
    Update: {
      id?: string
      created_at?: string
      interaction_id?: string
      user_id?: string
    }
    Relationships: [
      {
        foreignKeyName: "likes_user_building_id_fkey"
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
      },
    ]
  }
  collection_items: {
    Row: {
      id: string
      collection_id: string
      building_id: string
      order_index: number
      note: string | null
      custom_category_id: string | null
      is_hidden: boolean
      created_at: string | null
    }
    Insert: {
      id?: string
      collection_id: string
      building_id: string
      order_index?: number
      note?: string | null
      custom_category_id?: string | null
      is_hidden?: boolean
      created_at?: string | null
    }
    Update: {
      id?: string
      collection_id?: string
      building_id?: string
      order_index?: number
      note?: string | null
      custom_category_id?: string | null
      is_hidden?: boolean
      created_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "collection_items_collection_id_fkey"
        columns: ["collection_id"]
        isOneToOne: false
        referencedRelation: "collections"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "collection_items_building_id_fkey"
        columns: ["building_id"]
        isOneToOne: false
        referencedRelation: "buildings"
        referencedColumns: ["id"]
      },
    ]
  }
  collection_markers: {
    Row: {
      id: string
      collection_id: string
      google_place_id: string | null
      name: string
      category: string
      lat: number
      lng: number
      address: string | null
      notes: string | null
      website: string | null
      created_at: string
      created_by: string
    }
    Insert: {
      id?: string
      collection_id: string
      google_place_id?: string | null
      name: string
      category: string
      lat: number
      lng: number
      address?: string | null
      notes?: string | null
      website?: string | null
      created_at?: string
      created_by: string
    }
    Update: {
      id?: string
      collection_id?: string
      google_place_id?: string | null
      name?: string
      category?: string
      lat?: number
      lng?: number
      address?: string | null
      notes?: string | null
      website?: string | null
      created_at?: string
      created_by?: string
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
  companies: {
    Row: {
      id: string
      name: string
      slug: string
      bio: string | null
      country: string | null
      founded_year: number | null
      dissolved_year: number | null
      logo_url: string | null
      website: string | null
      verified_domain: string | null
      claim_status: string
      created_at: string
      updated_at: string
    }
    Insert: {
      id: string
      name: string
      slug: string
      bio?: string | null
      country?: string | null
      founded_year?: number | null
      dissolved_year?: number | null
      logo_url?: string | null
      website?: string | null
      verified_domain?: string | null
      claim_status?: string
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      bio?: string | null
      country?: string | null
      founded_year?: number | null
      dissolved_year?: number | null
      logo_url?: string | null
      website?: string | null
      verified_domain?: string | null
      claim_status?: string
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  company_stewards: {
    Row: {
      id: string
      company_id: string
      user_id: string
      role: string
      invited_by: string | null
      created_at: string
    }
    Insert: {
      id?: string
      company_id: string
      user_id: string
      role: string
      invited_by?: string | null
      created_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      user_id?: string
      role?: string
      invited_by?: string | null
      created_at?: string
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
        foreignKeyName: "company_stewards_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "company_stewards_invited_by_fkey"
        columns: ["invited_by"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
    ]
  }
  person_company_affiliations: {
    Row: {
      id: string
      person_id: string
      company_id: string
      year_from: number | null
      year_to: number | null
      role_note: string | null
      created_at: string
    }
    Insert: {
      id?: string
      person_id: string
      company_id: string
      year_from?: number | null
      year_to?: number | null
      role_note?: string | null
      created_at?: string
    }
    Update: {
      id?: string
      person_id?: string
      company_id?: string
      year_from?: number | null
      year_to?: number | null
      role_note?: string | null
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "person_company_affiliations_person_id_fkey"
        columns: ["person_id"]
        isOneToOne: false
        referencedRelation: "people"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "person_company_affiliations_company_id_fkey"
        columns: ["company_id"]
        isOneToOne: false
        referencedRelation: "companies"
        referencedColumns: ["id"]
      },
    ]
  }
  deletion_jobs: {
    Row: {
      id: string
      user_id: string
      status: string
      bucket_name: string
      logs: Json | null
      created_at: string | null
      updated_at: string | null
    }
    Insert: {
      id?: string
      user_id: string
      status?: string
      bucket_name?: string
      logs?: Json | null
      created_at?: string | null
      updated_at?: string | null
    }
    Update: {
      id?: string
      user_id?: string
      status?: string
      bucket_name?: string
      logs?: Json | null
      created_at?: string | null
      updated_at?: string | null
    }
    Relationships: []
  }
  collections: {
    Row: {
      id: string
      owner_id: string
      name: string
      slug: string
      description: string | null
      is_public: boolean
      cover_image_url: string | null
      created_at: string
      updated_at: string
      external_link: string | null
      show_community_images: boolean
      categorization_method: string | null
      custom_categories: Json | null
      categorization_selected_members: string[] | null
      itinerary: Json | null
    }
    Insert: {
      id?: string
      owner_id: string
      name: string
      slug: string
      description?: string | null
      is_public?: boolean
      cover_image_url?: string | null
      created_at?: string
      updated_at?: string
      external_link?: string | null
      show_community_images?: boolean
      categorization_method?: string | null
      custom_categories?: Json | null
      categorization_selected_members?: string[] | null
      itinerary?: Json | null
    }
    Update: {
      id?: string
      owner_id?: string
      name?: string
      slug?: string
      description?: string | null
      is_public?: boolean
      cover_image_url?: string | null
      created_at?: string
      updated_at?: string
      external_link?: string | null
      show_community_images?: boolean
      categorization_method?: string | null
      custom_categories?: Json | null
      categorization_selected_members?: string[] | null
      itinerary?: Json | null
    }
    Relationships: []
  }
  functional_categories: {
    Row: {
      id: string
      name: string
      slug: string
      created_at: string | null
    }
    Insert: {
      id?: string
      name: string
      slug: string
      created_at?: string | null
    }
    Update: {
      id?: string
      name?: string
      slug?: string
      created_at?: string | null
    }
    Relationships: []
  }
  functional_typologies: {
    Row: {
      id: string
      parent_category_id: string
      name: string
      slug: string
      created_at: string | null
    }
    Insert: {
      id?: string
      parent_category_id: string
      name: string
      slug: string
      created_at?: string | null
    }
    Update: {
      id?: string
      parent_category_id?: string
      name?: string
      slug?: string
      created_at?: string | null
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
  image_likes: {
    Row: {
      user_id: string
      image_id: string
      created_at: string | null
    }
    Insert: {
      user_id: string
      image_id: string
      created_at?: string | null
    }
    Update: {
      user_id?: string
      image_id?: string
      created_at?: string | null
    }
    Relationships: []
  }
  image_comments: {
    Row: {
      id: string
      created_at: string
      user_id: string
      image_id: string
      content: string
    }
    Insert: {
      id?: string
      created_at?: string
      user_id: string
      image_id: string
      content: string
    }
    Update: {
      id?: string
      created_at?: string
      user_id?: string
      image_id?: string
      content?: string
    }
    Relationships: [
      {
        foreignKeyName: "image_comments_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "image_comments_image_id_fkey"
        columns: ["image_id"]
        isOneToOne: false
        referencedRelation: "review_images"
        referencedColumns: ["id"]
      },
    ]
  }
  link_likes: {
    Row: {
      user_id: string
      link_id: string
      created_at: string | null
    }
    Insert: {
      user_id: string
      link_id: string
      created_at?: string | null
    }
    Update: {
      user_id?: string
      link_id?: string
      created_at?: string | null
    }
    Relationships: []
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
      architect_id: string | null
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
      architect_id?: string | null
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
      architect_id?: string | null
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
        referencedRelation: "user_buildings"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "notifications_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "notifications_architect_id_fkey"
        columns: ["architect_id"]
        isOneToOne: false
        referencedRelation: "architects"
        referencedColumns: ["id"]
      },
    ]
  }
  review_images: {
    Row: {
      id: string
      review_id: string
      user_id: string
      building_id: string | null
      storage_path: string
      likes_count: number | null
      is_generated: boolean | null
      is_official: boolean | null
      hero_image_id: string | null
      width_px: number | null
      height_px: number | null
      created_at: string | null
    }
    Insert: {
      id?: string
      review_id: string
      user_id: string
      building_id?: string | null
      storage_path: string
      likes_count?: number | null
      is_generated?: boolean | null
      is_official?: boolean | null
      hero_image_id?: string | null
      width_px?: number | null
      height_px?: number | null
      created_at?: string | null
    }
    Update: {
      id?: string
      review_id?: string
      user_id?: string
      building_id?: string | null
      storage_path?: string
      likes_count?: number | null
      is_generated?: boolean | null
      is_official?: boolean | null
      hero_image_id?: string | null
      width_px?: number | null
      height_px?: number | null
      created_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "review_images_review_id_fkey"
        columns: ["review_id"]
        isOneToOne: false
        referencedRelation: "user_buildings"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "review_images_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "review_images_building_id_fkey"
        columns: ["building_id"]
        isOneToOne: false
        referencedRelation: "buildings"
        referencedColumns: ["id"]
      },
    ]
  }
  review_links: {
    Row: {
      id: string
      review_id: string
      user_id: string
      url: string
      title: string | null
      created_at: string | null
    }
    Insert: {
      id?: string
      review_id: string
      user_id: string
      url: string
      title?: string | null
      created_at?: string | null
    }
    Update: {
      id?: string
      review_id?: string
      user_id?: string
      url?: string
      title?: string | null
      created_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "review_links_review_id_fkey"
        columns: ["review_id"]
        isOneToOne: false
        referencedRelation: "user_buildings"
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
  suggested_profile_hides: {
    Row: {
      user_id: string
      suggested_user_id: string
      created_at: string
    }
    Insert: {
      user_id: string
      suggested_user_id: string
      created_at?: string
    }
    Update: {
      user_id?: string
      suggested_user_id?: string
      created_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "suggested_profile_hides_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "suggested_profile_hides_suggested_user_id_fkey"
        columns: ["suggested_user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
    ]
  }
  user_buildings: {
    Row: {
      id: string
      user_id: string
      building_id: string
      status: string
      rating: number | null
      content: string | null
      tags: string[] | null
      edited_at: string | null
      created_at: string | null
      visibility: string | null
      video_url: string | null
      visited_at: string | null
    }
    Insert: {
      id?: string
      user_id: string
      building_id: string
      status?: string
      rating?: number | null
      content?: string | null
      tags?: string[] | null
      edited_at?: string | null
      created_at?: string | null
      visibility?: string | null
      video_url?: string | null
      visited_at?: string | null
    }
    Update: {
      id?: string
      user_id?: string
      building_id?: string
      status?: string
      rating?: number | null
      content?: string | null
      tags?: string[] | null
      edited_at?: string | null
      created_at?: string | null
      visibility?: string | null
      video_url?: string | null
      visited_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "user_buildings_user_id_fkey"
        columns: ["user_id"]
        isOneToOne: false
        referencedRelation: "profiles"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "user_buildings_building_id_fkey"
        columns: ["building_id"]
        isOneToOne: false
        referencedRelation: "buildings"
        referencedColumns: ["id"]
      },
    ]
  }
  user_folder_items: {
    Row: {
      folder_id: string
      collection_id: string
      created_at: string | null
    }
    Insert: {
      folder_id: string
      collection_id: string
      created_at?: string | null
    }
    Update: {
      folder_id?: string
      collection_id?: string
      created_at?: string | null
    }
    Relationships: [
      {
        foreignKeyName: "user_folder_items_folder_id_fkey"
        columns: ["folder_id"]
        isOneToOne: false
        referencedRelation: "user_folders"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "user_folder_items_collection_id_fkey"
        columns: ["collection_id"]
        isOneToOne: false
        referencedRelation: "collections"
        referencedColumns: ["id"]
      },
    ]
  }
  user_folders: {
    Row: {
      id: string
      created_at: string
      owner_id: string
      name: string
      slug: string
      description: string | null
      is_public: boolean
    }
    Insert: {
      id?: string
      created_at?: string
      owner_id: string
      name: string
      slug: string
      description?: string | null
      is_public?: boolean
    }
    Update: {
      id?: string
      created_at?: string
      owner_id?: string
      name?: string
      slug?: string
      description?: string | null
      is_public?: boolean
    }
    Relationships: []
  }
}

export type PlanoPublicFunctions = {
  check_slug_availability: { Args: RpcArgs; Returns: boolean | null }
  find_nearby_buildings: { Args: RpcArgs; Returns: Json }
  get_admin_content_stats: { Args: Record<string, never>; Returns: Json }
  get_admin_leaderboards: { Args: Record<string, never>; Returns: Json }
  get_admin_notifications: { Args: Record<string, never>; Returns: Json }
  get_admin_pulse: { Args: Record<string, never>; Returns: Json }
  get_admin_retention: { Args: Record<string, never>; Returns: Json }
  get_admin_trends: { Args: Record<string, never>; Returns: Json }
  get_architect_claim_status: { Args: RpcArgs; Returns: Json }
  get_building_leaderboards: { Args: Record<string, never>; Returns: Json }
  get_building_reviews: { Args: RpcArgs; Returns: Json }
  get_building_top_links: { Args: RpcArgs; Returns: Json }
  get_buildings_list: { Args: RpcArgs; Returns: Json }
  get_collection_stats: { Args: RpcArgs; Returns: Json }
  get_collections_feed: { Args: RpcArgs; Returns: Json }
  get_discovery_feed: { Args: RpcArgs; Returns: Json }
  get_discovery_filters: { Args: Record<string, never>; Returns: Json }
  get_feed: { Args: RpcArgs; Returns: Json }
  get_map_clusters: { Args: RpcArgs; Returns: Json }
  get_map_clusters_v2: { Args: RpcArgs; Returns: Json }
  get_map_pins: { Args: RpcArgs; Returns: Json }
  get_people_you_may_know: { Args: RpcArgs; Returns: Json }
  get_photo_heatmap_data: { Args: Record<string, never>; Returns: Json }
  get_potential_duplicates: { Args: RpcArgs; Returns: Json }
  get_suggested_posts: { Args: RpcArgs; Returns: Json }
  merge_buildings: { Args: RpcArgs; Returns: undefined }
  revert_building_change: { Args: RpcArgs; Returns: undefined }
  search_buildings: { Args: RpcArgs; Returns: Json }
}
