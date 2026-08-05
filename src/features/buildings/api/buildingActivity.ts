import { supabase } from "@/integrations/supabase/client";

/** How many faces each group returns. The totals come back unclamped. */
export const BUILDING_ACTIVITY_LIMIT = 12;

export interface BuildingActivityPerson {
  user_id: string;
  username: string;
  /** Ready-to-render URL; storage paths are resolved here, not in the view. */
  avatar_url: string | null;
  /** 0–3 award; null when the member logged the building without marking it. */
  rating: number | null;
  visited_at: string | null;
  /** True when the viewer follows this member — drives the "first" ordering. */
  is_followed: boolean;
}

export interface BuildingActivity {
  visited: BuildingActivityPerson[];
  saved: BuildingActivityPerson[];
  totalVisited: number;
  totalSaved: number;
}

interface ActivityPayload {
  visited?: BuildingActivityPerson[];
  saved?: BuildingActivityPerson[];
  total_visited?: number;
  total_saved?: number;
}

/**
 * Avatars are stored either as a full URL or as a bare path inside the
 * `avatars` bucket, depending on when the member uploaded one.
 */
function resolveAvatar(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function shape(people: BuildingActivityPerson[]): BuildingActivityPerson[] {
  return people.map((p) => ({ ...p, avatar_url: resolveAvatar(p.avatar_url) }));
}

/**
 * Members who saved or visited a building.
 *
 * `get_building_activity` is SECURITY DEFINER on purpose: the RLS policy on
 * `user_buildings` only exposes another member's row when that member also
 * wrote a visible `building_posts` entry, so a plain query would return the
 * viewer's own row and nothing else — exactly the silent saves and visits this
 * surface exists to show. It is granted to `authenticated` only, and never
 * returns `status = 'ignored'`.
 * See docs/decisions/0029-building-activity-is-visible-to-members.md.
 */
export async function fetchBuildingActivity(
  buildingId: string,
  limit: number = BUILDING_ACTIVITY_LIMIT,
): Promise<BuildingActivity> {
  const { data, error } = await supabase.rpc("get_building_activity", {
    p_building_id: buildingId,
    p_limit: limit,
  });
  if (error) throw error;

  const payload = (data ?? {}) as ActivityPayload;
  return {
    visited: shape(payload.visited ?? []),
    saved: shape(payload.saved ?? []),
    totalVisited: payload.total_visited ?? 0,
    totalSaved: payload.total_saved ?? 0,
  };
}
