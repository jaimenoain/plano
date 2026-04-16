import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { classifyBuildingPathIdSegment } from "@/utils/buildingPathId";

type AppSupabaseClient = SupabaseClient<Database>;

export type BuildingWithLocality = {
  id: string;
  slug: string | null;
  short_id: number | null;
  locality: { country_code: string; city_slug: string } | null;
};

/**
 * Fetches minimal building data (id, slug, short_id) plus its locality
 * (country_code, city_slug) for redirect construction.
 */
export async function getBuildingWithLocality(
  supabase: AppSupabaseClient,
  idOrShortId: string,
): Promise<BuildingWithLocality | null> {
  const segment = classifyBuildingPathIdSegment(idOrShortId);

  let query = supabase
    .from("buildings")
    .select("id, slug, short_id, locality_id");

  if (segment.kind === "uuid") {
    query = query.eq("id", segment.value);
  } else if (segment.kind === "shortId") {
    query = query.eq("short_id", segment.value);
  } else {
    query = query.eq("slug", segment.value);
  }

  const { data: building } = await query.maybeSingle();
  if (!building) return null;

  let locality: { country_code: string; city_slug: string } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localityId = (building as any).locality_id as string | null | undefined;
  if (localityId) {
    const { data: loc } = await supabase
      .from("localities")
      .select("country_code, slug")
      .eq("id", localityId)
      .maybeSingle();
    if (loc) {
      locality = { country_code: loc.country_code, city_slug: loc.slug };
    }
  }

  return {
    id: building.id,
    slug: building.slug ?? null,
    short_id: building.short_id ?? null,
    locality,
  };
}
