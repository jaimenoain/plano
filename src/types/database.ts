import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];

// --- Present in generated `src/integrations/supabase/types.ts` ---
export type Profile = PublicTables["profiles"]["Row"];
export type ProfileInsert = PublicTables["profiles"]["Insert"];
export type ProfileUpdate = PublicTables["profiles"]["Update"];

export type Follow = PublicTables["follows"]["Row"];

/** Row from `public.notifications` (not the DOM Notification API). */
export type NotificationRow = PublicTables["notifications"]["Row"];

/*
 * TODO: regenerate types — uncomment when these tables exist in generated types:
 *
 * export type Building = PublicTables['buildings']['Row'];
 * export type BuildingInsert = PublicTables['buildings']['Insert'];
 * export type BuildingUpdate = PublicTables['buildings']['Update'];
 * export type UserBuilding = PublicTables['user_buildings']['Row'];
 * export type UserBuildingInsert = PublicTables['user_buildings']['Insert'];
 * export type UserBuildingUpdate = PublicTables['user_buildings']['Update'];
 * export type ReviewImage = PublicTables['review_images']['Row'];
 * export type Collection = PublicTables['collections']['Row'];
 * export type CollectionItem = PublicTables['collection_items']['Row'];
 * export type Architect = PublicTables['architects']['Row'];
 * export type BuildingArchitect = PublicTables['building_architects']['Row'];
 * export type FunctionalCategoryRow = PublicTables['functional_categories']['Row'];
 * export type FunctionalTypologyRow = PublicTables['functional_typologies']['Row'];
 * export type AttributeGroupRow = PublicTables['attribute_groups']['Row'];
 * export type AttributeRow = PublicTables['attributes']['Row'];
 */

/**
 * Taxonomy / attribute shapes used by the app; replace with `Tables<'…'>` rows after `npm run gen-types`.
 */
export interface FunctionalCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface FunctionalTypology {
  id: string;
  name: string;
  parent_category_id: string;
  slug: string;
  created_at: string;
}

export interface AttributeGroup {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Attribute {
  id: string;
  name: string;
  group_id: string;
  slug: string;
  created_at: string;
}
