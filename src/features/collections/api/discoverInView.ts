/**
 * discoverInView.ts — the catalogue buildings inside the collection map's viewport.
 *
 * Reads `get_buildings_list`, the same bbox-paged RPC the /search browse list
 * uses. Deliberately NOT the cluster RPC that draws the discovery pins: those
 * come back as opaque count bubbles with no names, which cannot render a list.
 * See ADR 0024.
 *
 * Kept in an api/ module so the Supabase browser client stays out of hooks and
 * components (ADR 0015).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { MapFilters } from "@/types/plano-map";
import type { Bounds } from "@/utils/map";

export const DISCOVER_PAGE_SIZE = 20;

/**
 * One catalogue building in view. Mirrors `get_buildings_list`'s return columns,
 * which are exactly `BuildingListRow`'s prop set — that correspondence is why
 * this list reuses /search's row rather than adapting to `DiscoveryBuilding`.
 */
export interface DiscoverInViewRow {
  id: string;
  name: string;
  alt_name: string | null;
  city: string | null;
  credit_names: string[] | null;
  image_url: string | null;
  rating: number | null;
  status: string | null;
  /** Raw construction status (Built/Lost/Unbuilt/Under Construction/Temporary). */
  construction_status: string | null;
  slug: string | null;
  short_id: number | null;
  locality_country_code: string | null;
  locality_city_slug: string | null;
  lat: number;
  lng: number;
}

export interface DiscoverInViewRpcArgs {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  filter_criteria: Json;
  page: number;
  page_size: number;
}

/**
 * `MapFilters` → `get_buildings_list`'s `filter_criteria`. Only the keys that
 * RPC actually reads (Task 5.7's discovery filters — tier, era, and the
 * standard building filters) — no `query`/`sort_by`/ranking/gap-layer keys,
 * which either don't apply here or aren't in `get_buildings_list` at all.
 * Mirrors the equivalent block in `useMapData.ts`'s `filterCriteria`.
 */
function toFilterCriteria(filters: MapFilters): Json {
  const allAttributeIds = [
    ...(filters.attributes ?? []),
    ...(filters.materials ?? []),
    ...(filters.styles ?? []),
    ...(filters.contexts ?? []),
  ];
  const uniqueAttributeIds = [...new Set(allAttributeIds)];

  const criteria: Record<string, Json | undefined> = {
    category_id: filters.category,
    typology_ids: filters.typologies,
    attribute_ids: uniqueAttributeIds.length > 0 ? uniqueAttributeIds : undefined,
    architect_ids: filters.people?.map((p) => p.id),
    credit_company_id: filters.creditCompany?.id ?? undefined,
    credit_roles: filters.creditRoles && filters.creditRoles.length > 0 ? filters.creditRoles : undefined,
    construction_statuses: filters.constructionStatuses,
    award_id: filters.awardId,
    award_outcome: filters.awardOutcome,
    award_year_from: filters.awardYearFrom,
    award_year_to: filters.awardYearTo,
    size_categories: filters.sizeCategories && filters.sizeCategories.length > 0 ? filters.sizeCategories : undefined,
    min_size_sqm: filters.minSizeSqm || undefined,
    max_size_sqm: filters.maxSizeSqm || undefined,
    min_storeys: filters.minStoreys || undefined,
    max_storeys: filters.maxStoreys || undefined,
    centuries: filters.centuries && filters.centuries.length > 0 ? filters.centuries : undefined,
    min_tier_rank: filters.minTierRank,
  };

  return Object.fromEntries(
    Object.entries(criteria).filter(([, value]) => value !== undefined),
  ) as Json;
}

/**
 * Bounds → RPC arguments. Exported for its own test: the compass mapping is the
 * one place here a silent transposition would return plausible-looking rows from
 * the wrong part of the world.
 *
 * `filters` defaults to empty, matching the `NO_FILTERS` the discovery pin
 * layer passes when Task 5.7's discovery filters are untouched, so list and
 * map disagree only by clustering.
 */
export function discoverInViewRpcArgs(
  bounds: Bounds,
  page: number,
  filters: MapFilters = {},
): DiscoverInViewRpcArgs {
  return {
    min_lat: bounds.south,
    max_lat: bounds.north,
    min_lng: bounds.west,
    max_lng: bounds.east,
    filter_criteria: toFilterCriteria(filters),
    page,
    page_size: DISCOVER_PAGE_SIZE,
  };
}

export async function fetchBuildingsInView(
  bounds: Bounds,
  page: number,
  filters?: MapFilters,
): Promise<DiscoverInViewRow[]> {
  const { data, error } = await supabase.rpc(
    "get_buildings_list",
    discoverInViewRpcArgs(bounds, page, filters),
  );

  if (error) throw error;
  return (data ?? []) as unknown as DiscoverInViewRow[];
}
