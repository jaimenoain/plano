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
 * Bounds → RPC arguments. Exported for its own test: the compass mapping is the
 * one place here a silent transposition would return plausible-looking rows from
 * the wrong part of the world.
 *
 * `filter_criteria` is empty on purpose — it matches the `NO_FILTERS` the
 * discovery pin layer passes, so list and map disagree only by clustering.
 */
export function discoverInViewRpcArgs(bounds: Bounds, page: number): DiscoverInViewRpcArgs {
  return {
    min_lat: bounds.south,
    max_lat: bounds.north,
    min_lng: bounds.west,
    max_lng: bounds.east,
    filter_criteria: {},
    page,
    page_size: DISCOVER_PAGE_SIZE,
  };
}

export async function fetchBuildingsInView(
  bounds: Bounds,
  page: number,
): Promise<DiscoverInViewRow[]> {
  const { data, error } = await supabase.rpc(
    "get_buildings_list",
    discoverInViewRpcArgs(bounds, page),
  );

  if (error) throw error;
  return (data ?? []) as unknown as DiscoverInViewRow[];
}
