import { supabase } from "@/integrations/supabase/client";
import type { DiscoveryBuilding } from "../components/types";

export interface BuildingSearchHit {
  id: string;
  name: string;
  slug: string;
  alt_name: string | null;
  hero_image_url: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  popularity_score: number | null;
  tier_rank: string | null;
  /** Raw construction status (buildings.status: Built/Lost/Unbuilt/Under Construction/Temporary). */
  construction_status?: string | null;
  credit_names: string[];
  rank_score: number;
  short_id?: number | null;
  locality_country_code?: string | null;
  locality_city_slug?: string | null;
}

export interface SearchBuildingsV2Filters {
  category_id?: string;
  typology_ids?: string[];
  attribute_ids?: string[];
  credit_company_id?: string;
  credit_roles?: string[];
  construction_statuses?: string[];
  exclude_construction_statuses?: string[];
  size_categories?: string[];
  min_size_sqm?: number;
  max_size_sqm?: number;
  min_storeys?: number;
  max_storeys?: number;
  award_id?: string;
  award_outcome?: string;
  award_year_from?: number;
  award_year_to?: number;
  cities?: string[];
  country?: string;
  year?: number;
  access_levels?: string[];
  access_logistics?: string[];
  access_costs?: string[];
  centuries?: number[];
  collections?: string[];
  folders?: string[];
  rated_by?: string[];
  filter_contacts?: boolean;
  contact_min_rating?: number;
}

export interface SearchBuildingsV2Options {
  limit?: number;
  offset?: number;
  filters?: SearchBuildingsV2Filters;
}

export async function searchBuildingsV2(
  query: string,
  opts: SearchBuildingsV2Options = {},
): Promise<BuildingSearchHit[]> {
  const { limit = 20, offset = 0, filters } = opts;

  // Cast through unknown: search_buildings_v2 is not yet in generated types
  // (requires running `npm run gen-types` after the Phase 1 migration is applied).
  const { data, error } = await (supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }).rpc("search_buildings_v2", {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
    p_filters: filters ?? {},
  });

  if (error) throw error;
  return ((data as unknown[]) ?? []) as BuildingSearchHit[];
}

/**
 * Adapt a ranked search hit to the row shape the discovery/SERP components draw
 * (`DiscoveryList`, `DiscoveryBuildingCard`). The RPC returns credits as bare
 * names, so each credit gets its own name as its id — the card only ever reads
 * `credits[0].name`, and nothing keys off a credit id in these lists.
 */
export function discoveryBuildingFromSearchHit(hit: BuildingSearchHit): DiscoveryBuilding {
  return {
    id: hit.id,
    name: hit.name,
    slug: hit.slug,
    short_id: hit.short_id ?? null,
    alt_name: hit.alt_name,
    main_image_url: hit.hero_image_url,
    // A hit without coordinates still lists (search_buildings_v2 has no location
    // gate); 0/0 is the shape's existing "no pin" sentinel.
    location_lat: hit.lat ?? 0,
    location_lng: hit.lng ?? 0,
    city: hit.city,
    country: hit.country,
    year_completed: hit.year_completed,
    credits: hit.credit_names.map((name) => ({ id: name, name })),
    styles: [],
    status: (hit.construction_status ?? null) as DiscoveryBuilding["status"],
    locality_country_code: hit.locality_country_code ?? null,
    locality_city_slug: hit.locality_city_slug ?? null,
  };
}
