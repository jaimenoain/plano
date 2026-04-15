import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";

export interface RelatedBuilding {
  id: string;
  name: string;
  slug: string | null;
  short_id: number | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  imageUrl: string | null;
  buildingUrl: string;
}

const BUILDING_SELECT =
  "id, name, slug, short_id, city, country, year_completed, hero_image_url, community_preview_url, popularity_score";

type BuildingRow = {
  id: string;
  name: string;
  slug: string | null;
  short_id: number | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  community_preview_url: string | null;
  popularity_score: number;
};

function mapBuildingRow(row: BuildingRow): RelatedBuilding {
  const imageUrl =
    getBuildingImageUrl(row.hero_image_url) ??
    getBuildingImageUrl(row.community_preview_url) ??
    null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    short_id: row.short_id,
    city: row.city,
    country: row.country,
    year_completed: row.year_completed,
    imageUrl,
    buildingUrl: getBuildingUrl(row.id, row.slug, row.short_id),
  };
}

/** Fetch up to `limit` buildings credited to `personId`, excluding `excludeBuildingId`. */
export async function getRelatedBuildingsByPerson(
  personId: string,
  excludeBuildingId: string,
  limit = 4,
): Promise<RelatedBuilding[]> {
  const { data, error } = await supabase
    .from("building_credits")
    .select(`building:buildings(${BUILDING_SELECT})`)
    .eq("person_id", personId)
    .in("status", ["active", "verified"])
    .neq("building_id", excludeBuildingId)
    .limit(limit * 2); // over-fetch so we can sort client-side
  if (error || !data) return [];
  return (data as Array<{ building: BuildingRow | null }>)
    .map((r) => r.building)
    .filter((b): b is BuildingRow => b != null)
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, limit)
    .map(mapBuildingRow);
}

/** Fetch up to `limit` buildings credited to `companyId`, excluding `excludeBuildingId`. */
export async function getRelatedBuildingsByCompany(
  companyId: string,
  excludeBuildingId: string,
  limit = 4,
): Promise<RelatedBuilding[]> {
  const { data, error } = await supabase
    .from("building_credits")
    .select(`building:buildings(${BUILDING_SELECT})`)
    .eq("company_id", companyId)
    .in("status", ["active", "verified"])
    .neq("building_id", excludeBuildingId)
    .limit(limit * 2);
  if (error || !data) return [];
  return (data as Array<{ building: BuildingRow | null }>)
    .map((r) => r.building)
    .filter((b): b is BuildingRow => b != null)
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, limit)
    .map(mapBuildingRow);
}

/** Fetch up to `limit` buildings in `city`, ordered by popularity, excluding `excludeBuildingId`. */
export async function getBuildingsByCity(
  city: string,
  excludeBuildingId: string,
  limit = 4,
): Promise<RelatedBuilding[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select(BUILDING_SELECT)
    .eq("city", city)
    .neq("id", excludeBuildingId)
    .neq("is_deleted", true)
    .order("popularity_score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as BuildingRow[]).map(mapBuildingRow);
}
