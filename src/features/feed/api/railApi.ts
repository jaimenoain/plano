import { supabase } from "@/integrations/supabase/client";

/**
 * Data access for the feed's sidebar rail modules. Components in
 * components/sidebar/ call these typed fetchers through React Query —
 * the Supabase client itself stays inside this api/ module.
 */

export type SpotlightBuilding = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  community_preview_url: string | null;
};

/**
 * Candidate pool for "Today": most popular buildings that have an image.
 * `hero_image_url` is a computed field PostgREST can't filter on (and it is
 * often null while `community_preview_url` is set), so the image requirement
 * is applied client-side over the top-popularity slice.
 */
export async function fetchSpotlightPool(): Promise<SpotlightBuilding[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select(
      "id, slug, name, city, country, year_completed, hero_image_url, community_preview_url",
    )
    .neq("is_deleted", true)
    .order("popularity_score", { ascending: false })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as SpotlightBuilding[])
    .filter((row) => row.hero_image_url || row.community_preview_url)
    .slice(0, 24);
}

export type BucketBuilding = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  community_preview_url: string | null;
  is_deleted: boolean | null;
};

export type BucketRow = {
  id: string;
  created_at: string;
  building: BucketBuilding | null;
};

/** The member's three most recent pending saves — their bucket list. */
export async function fetchBucketList(userId: string): Promise<BucketRow[]> {
  const { data, error } = await supabase
    .from("user_buildings")
    .select(
      `
      id,
      created_at,
      building:buildings!user_buildings_building_id_fkey(
        id, slug, name, city, country, year_completed,
        hero_image_url, community_preview_url, is_deleted
      )
    `,
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return ((data ?? []) as unknown as BucketRow[])
    .filter((row) => row.building && !row.building.is_deleted)
    .slice(0, 3);
}

export type TrendingArchitect = {
  id: string;
  name: string;
  slug: string | null;
  avatar_url: string | null;
  building_count: number;
};

/**
 * Architects behind the buildings the community posted about in the last
 * 7 days, ranked by distinct buildings credited (design architecture only).
 */
export async function fetchTrendingArchitects(): Promise<TrendingArchitect[]> {
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error: postsError } = await supabase
    .from("building_posts")
    .select("building_id")
    .eq("visibility", "public")
    .gte("created_at", sinceIso)
    .not("building_id", "is", null);

  if (postsError) throw postsError;

  const buildingIds = Array.from(
    new Set((posts ?? []).map((p) => p.building_id).filter(Boolean) as string[]),
  );
  if (buildingIds.length === 0) return [];

  const { data: credits, error: creditsError } = await supabase
    .from("building_credits")
    .select(
      `
      building_id,
      person:people!building_credits_person_id_fkey(id, name, slug, avatar_url)
    `,
    )
    .in("building_id", buildingIds)
    .eq("role", "design_architecture")
    .in("status", ["active", "verified"])
    .not("person_id", "is", null);

  if (creditsError) throw creditsError;

  const byPerson = new Map<string, { person: TrendingArchitect; buildings: Set<string> }>();
  for (const credit of (credits ?? []) as unknown as Array<{
    building_id: string;
    person: { id: string; name: string; slug: string | null; avatar_url: string | null } | null;
  }>) {
    const person = credit.person;
    if (!person) continue;
    const entry = byPerson.get(person.id);
    if (entry) {
      entry.buildings.add(credit.building_id);
    } else {
      byPerson.set(person.id, {
        person: { ...person, building_count: 0 },
        buildings: new Set([credit.building_id]),
      });
    }
  }

  return Array.from(byPerson.values())
    .map(({ person, buildings }) => ({ ...person, building_count: buildings.size }))
    .sort((a, b) => b.building_count - a.building_count)
    .slice(0, 5);
}

export type Census = { buildings: number };

/**
 * Catalogue total for the colophon's mono census line. Buildings only —
 * `people` is RLS-filtered per viewer, so its count would read nonsense.
 */
export async function fetchCensus(): Promise<Census> {
  const { count } = await supabase
    .from("buildings")
    .select("id", { count: "exact", head: true })
    .neq("is_deleted", true);

  return { buildings: count ?? 0 };
}
