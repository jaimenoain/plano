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
  Database["public"]["Functions"]["get_ambassador_recent_buildings"]["Returns"][number] & {
    moderated_at: string | null;
    moderated_by_username: string | null;
  };

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
  // Cast required: generated types predate the moderated_at / moderated_by_username columns
  // added by migration 20271110000000. Remove cast after next gen-types run.
  return (data ?? []) as unknown as AmbassadorRecentBuilding[];
}

export async function approveBuilding(buildingId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("ambassador_approve_building", {
    p_building_id: buildingId,
  });
  if (error) throw error;
}

export async function approvePhoto(photoId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("ambassador_approve_photo", {
    p_photo_id: photoId,
  });
  if (error) throw error;
}

export async function approveCredit(creditId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("ambassador_approve_credit", {
    p_credit_id: creditId,
  });
  if (error) throw error;
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
  title: string | null;
  body: string | null;
  uploader_username: string | null;
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
    .is("moderated_at", null)
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
      "id, created_at, video_url, title, body, buildings!inner(id, name, slug, short_id), profiles!user_id(username)",
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
    title: row.title ?? null,
    body: row.body ?? null,
    uploader_username: row.profiles?.username ?? null,
    building_id: row.buildings.id,
    building_name: row.buildings.name,
    building_slug: row.buildings.slug,
    building_short_id: row.buildings.short_id,
  }));
}

export async function fetchModerationCredits(chapterId: string): Promise<ModerationCreditItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_ambassador_moderation_credits", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    role: row.role,
    building_id: row.building_id,
    building_name: row.building_name,
    building_slug: row.building_slug,
    building_short_id: row.building_short_id,
    entity_name: row.entity_name ?? null,
  }));
}
