import { supabase } from "@/integrations/supabase/client";

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
