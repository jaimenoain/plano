import type { Tables } from "@/integrations/supabase/types";
import type { CreditSummary, StyleSummary } from "@/features/search/components/types";

export type LocalityRow = Tables<"localities">;

export interface LocalityDTO {
  id: string;
  slug: string;
  city: string;
  country: string;
  country_code: string;
  buildings_count: number;
  hero_image_url: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * A building row fetched for the locality page — compatible with DiscoveryBuilding
 * so it can be passed directly to DiscoveryBuildingCard and CollectionMapGL.
 */
export interface LocalityBuildingDTO {
  id: string;
  name: string;
  alt_name: string | null;
  short_id: number;
  slug: string | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  main_image_url: string | null;
  status: "Built" | "Under Construction" | "Unbuilt" | "Lost" | "Temporary" | null;
  /** Extracted from PostGIS location column via parseLocation. 0 if no location. */
  location_lat: number;
  /** Extracted from PostGIS location column via parseLocation. 0 if no location. */
  location_lng: number;
  /** Not fetched for this context; null satisfies CreditSummary[] | null. */
  credits: CreditSummary[] | null;
  /** Not fetched for this context; null satisfies StyleSummary[] | null. */
  styles: StyleSummary[] | null;
}
