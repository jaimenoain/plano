import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const EMBASSY_TASK_FEED_LIMIT = 20;
export const EMBASSY_SEARCH_FEED_LIMIT = 500;

export type AmbassadorBuildingNoPhoto =
  Database["public"]["Functions"]["get_ambassador_buildings_without_photos"]["Returns"][number];

export type AmbassadorBuildingMissingMeta =
  Database["public"]["Functions"]["get_ambassador_buildings_missing_metadata"]["Returns"][number];

export type AmbassadorUnclaimedFirm =
  Database["public"]["Functions"]["get_ambassador_unclaimed_firms"]["Returns"][number];

export type AmbassadorRecentBuilding =
  Database["public"]["Functions"]["get_ambassador_recent_buildings"]["Returns"][number];

export type AmbassadorAuditRow =
  Database["public"]["Functions"]["get_ambassador_my_audit_timeline"]["Returns"][number];

export async function fetchAmbassadorBuildingsWithoutPhotos(
  chapterId: string,
): Promise<AmbassadorBuildingNoPhoto[]> {
  const { data, error } = await supabase.rpc("get_ambassador_buildings_without_photos", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAmbassadorBuildingsMissingMetadata(
  chapterId: string,
): Promise<AmbassadorBuildingMissingMeta[]> {
  const { data, error } = await supabase.rpc("get_ambassador_buildings_missing_metadata", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_SEARCH_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAmbassadorUnclaimedFirms(
  chapterId: string,
): Promise<AmbassadorUnclaimedFirm[]> {
  const { data, error } = await supabase.rpc("get_ambassador_unclaimed_firms", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_SEARCH_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAmbassadorRecentBuildings(
  chapterId: string,
): Promise<AmbassadorRecentBuilding[]> {
  const { data, error } = await supabase.rpc("get_ambassador_recent_buildings", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAmbassadorMyAuditTimeline(): Promise<AmbassadorAuditRow[]> {
  const { data, error } = await supabase.rpc("get_ambassador_my_audit_timeline", {
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export type ModerationPhotoItem = {
  id: string;
  created_at: string;
  storage_path: string;
  caption: string | null;
  building_id: string;
  building_name: string;
  building_slug: string | null;
  building_short_id: number | null;
};

export type ModerationVideoItem = {
  id: string;
  created_at: string;
  video_url: string;
  building_id: string;
  building_name: string;
  building_slug: string | null;
  building_short_id: number | null;
};

export type ModerationCreditItem = {
  id: string;
  created_at: string;
  role: string;
  building_id: string;
  building_name: string;
  building_slug: string | null;
  building_short_id: number | null;
  entity_name: string | null;
};

export async function fetchModerationPhotos(): Promise<ModerationPhotoItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("review_images")
    .select(
      "id, created_at, storage_path, caption, building_posts!inner(building_id, buildings!inner(id, name, slug, short_id))",
    )
    .order("created_at", { ascending: false })
    .limit(EMBASSY_TASK_FEED_LIMIT);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    storage_path: row.storage_path,
    caption: row.caption,
    building_id: row.building_posts.buildings.id,
    building_name: row.building_posts.buildings.name,
    building_slug: row.building_posts.buildings.slug,
    building_short_id: row.building_posts.buildings.short_id,
  }));
}

export async function fetchModerationVideos(): Promise<ModerationVideoItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("building_posts")
    .select(
      "id, created_at, video_url, building_id, buildings!inner(id, name, slug, short_id)",
    )
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(EMBASSY_TASK_FEED_LIMIT);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    video_url: row.video_url,
    building_id: row.buildings.id,
    building_name: row.buildings.name,
    building_slug: row.buildings.slug,
    building_short_id: row.buildings.short_id,
  }));
}

export async function fetchModerationCredits(): Promise<ModerationCreditItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("building_credits")
    .select(
      "id, created_at, role, building_id, buildings!inner(id, name, slug, short_id), people!building_credits_person_id_fkey(name), companies!building_credits_company_id_fkey(name)",
    )
    .order("created_at", { ascending: false })
    .limit(EMBASSY_TASK_FEED_LIMIT);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    role: row.role,
    building_id: row.buildings.id,
    building_name: row.buildings.name,
    building_slug: row.buildings.slug,
    building_short_id: row.buildings.short_id,
    entity_name: row.people?.name ?? row.companies?.name ?? null,
  }));
}
