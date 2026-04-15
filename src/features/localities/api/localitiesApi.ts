import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { LocalityDTO, LocalityBuildingDTO } from "../types";
import { parseLocation } from "@/utils/location";

type AppSupabaseClient = SupabaseClient<Database>;

export const LOCALITY_BUILDINGS_PAGE_SIZE = 24;

const BUILDING_SELECT =
  "id, name, alt_name, short_id, slug, city, country, year_completed, hero_image_url, community_preview_url, status, location, popularity_score";

type BuildingSelectRow = {
  id: string;
  name: string;
  alt_name: string | null;
  short_id: number;
  slug: string | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  community_preview_url: string | null;
  status: string | null;
  location: unknown;
  popularity_score: number;
};

function mapBuildingRow(row: BuildingSelectRow): LocalityBuildingDTO {
  const coords = parseLocation(row.location);
  const imagePath = row.hero_image_url ?? row.community_preview_url ?? null;
  return {
    id: row.id,
    name: row.name,
    alt_name: row.alt_name ?? null,
    short_id: row.short_id,
    slug: row.slug ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    year_completed: row.year_completed ?? null,
    main_image_url: imagePath,
    status: (row.status as LocalityBuildingDTO["status"]) ?? null,
    location_lat: coords?.lat ?? 0,
    location_lng: coords?.lng ?? 0,
    credits: null,
    styles: null,
  };
}

/** Server-side: fetch a locality by country code + city slug. Returns null if not found. */
export async function getLocalityByCountryCity(
  supabaseClient: AppSupabaseClient,
  countryCode: string,
  citySlug: string,
): Promise<LocalityDTO | null> {
  const { data, error } = await supabaseClient
    .from("localities")
    .select("*")
    .eq("country_code", countryCode.toUpperCase())
    .eq("city_slug", citySlug)
    .maybeSingle();

  if (error || !data) return null;
  return data as LocalityDTO;
}

/** Server-side: fetch all localities for a country, ordered by buildings_count desc. */
export async function getCountryLocalities(
  supabaseClient: AppSupabaseClient,
  countryCode: string,
): Promise<LocalityDTO[]> {
  const { data, error } = await supabaseClient
    .from("localities")
    .select("*")
    .eq("country_code", countryCode.toUpperCase())
    .order("buildings_count", { ascending: false });

  if (error || !data) return [];
  return data as LocalityDTO[];
}

/** Server-side: aggregate stats for a country — total buildings, locality count, country name. */
export async function getCountryStats(
  supabaseClient: AppSupabaseClient,
  countryCode: string,
): Promise<{ totalBuildings: number; localityCount: number; countryName: string }> {
  const { data, error } = await supabaseClient
    .from("localities")
    .select("country, buildings_count")
    .eq("country_code", countryCode.toUpperCase());

  if (error || !data || data.length === 0) {
    return { totalBuildings: 0, localityCount: 0, countryName: "" };
  }

  const totalBuildings = data.reduce((sum, row) => sum + (row.buildings_count ?? 0), 0);
  return {
    totalBuildings,
    localityCount: data.length,
    countryName: data[0].country ?? "",
  };
}

/** Server-side: fetch a locality by its slug. Returns null if not found. */
export async function getLocalityBySlug(
  supabaseClient: AppSupabaseClient,
  slug: string,
): Promise<LocalityDTO | null> {
  const { data, error } = await supabaseClient
    .from("localities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as LocalityDTO;
}

/** Server-side OR client-side: fetch a paginated list of buildings for a locality. */
export async function getLocalityBuildings(
  supabaseClient: AppSupabaseClient,
  localityId: string,
  page: number,
  pageSize: number = LOCALITY_BUILDINGS_PAGE_SIZE,
): Promise<LocalityBuildingDTO[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabaseClient
    .from("buildings")
    .select(BUILDING_SELECT)
    .eq("locality_id", localityId)
    .eq("is_deleted", false)
    .order("popularity_score", { ascending: false })
    .range(from, to);

  if (error || !data) return [];
  return (data as BuildingSelectRow[]).map(mapBuildingRow);
}

/** Client-side: paginated buildings using the browser Supabase client. */
export async function getLocalityBuildingsClient(
  localityId: string,
  page: number,
  pageSize: number = LOCALITY_BUILDINGS_PAGE_SIZE,
): Promise<LocalityBuildingDTO[]> {
  return getLocalityBuildings(supabase, localityId, page, pageSize);
}

/**
 * Client-side: fetch all buildings with a valid location for rendering on the map.
 * No pagination — capped at 500.
 */
export async function getLocalityMapBuildings(
  localityId: string,
): Promise<LocalityBuildingDTO[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select(BUILDING_SELECT)
    .eq("locality_id", localityId)
    .eq("is_deleted", false)
    .not("location", "is", null)
    .order("popularity_score", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return (data as BuildingSelectRow[])
    .map(mapBuildingRow)
    .filter((b) => b.location_lat !== 0 || b.location_lng !== 0);
}
