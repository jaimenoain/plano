import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const EMBASSY_TASK_FEED_LIMIT = 20;
// Fetch 2× what we display so the second client-side batch is already in cache
// when the user approves the first — makes the transition instant.
export const EMBASSY_PHOTO_MODERATION_LIMIT = 200;
export const EMBASSY_PHOTO_MODERATION_BATCH_SIZE = 100;
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

export async function approveVideo(postId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("ambassador_approve_video", {
    p_post_id: postId,
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

export async function fetchModerationPhotos(chapterId: string): Promise<ModerationPhotoItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_ambassador_moderation_photos", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_PHOTO_MODERATION_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchModerationVideos(chapterId: string): Promise<ModerationVideoItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_ambassador_moderation_videos", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

// ─── Event discoveries ────────────────────────────────────────────────────────

export type EventDiscovery = {
  id: string;
  chapter_id: string;
  locality_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  external_link: string | null;
  cover_image_url: string | null;
  source_url: string;
  snippet: string | null;
  status: "pending" | "published" | "discarded";
  duplicate_of_event_id: string | null;
  duplicate_of_title: string | null;
  duplicate_of_start_at: string | null;
  created_at: string;
};

export async function fetchPendingEventDiscoveries(chapterId: string): Promise<EventDiscovery[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("embassy_event_discoveries")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("status", "pending")
    .order("start_at", { ascending: true });
  if (error) throw error;
  const rows: EventDiscovery[] = (data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any): EventDiscovery => ({
      id: r.id,
      chapter_id: r.chapter_id,
      locality_id: r.locality_id,
      title: r.title,
      description: r.description,
      start_at: r.start_at,
      end_at: r.end_at,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      external_link: r.external_link,
      cover_image_url: r.cover_image_url,
      source_url: r.source_url,
      snippet: r.snippet,
      status: r.status,
      duplicate_of_event_id: r.duplicate_of_event_id ?? null,
      duplicate_of_title: null,
      duplicate_of_start_at: null,
      created_at: r.created_at,
    }),
  );

  // Batch-fetch duplicate event titles (FK-agnostic — same pattern as AmbassadorCampaigns)
  const dupIds = [...new Set(rows.map((r) => r.duplicate_of_event_id).filter(Boolean))] as string[];
  if (dupIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: evts } = await (supabase as any)
      .from("events")
      .select("id, title, start_at")
      .in("id", dupIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evtMap = new Map((evts ?? []).map((e: any) => [e.id, e]));
    for (const row of rows) {
      if (row.duplicate_of_event_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = evtMap.get(row.duplicate_of_event_id) as any;
        if (evt) {
          row.duplicate_of_title = evt.title;
          row.duplicate_of_start_at = evt.start_at;
        }
      }
    }
  }

  return rows;
}

export async function publishEventDiscovery(discoveryId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("ambassador_publish_event_discovery", {
    p_discovery_id: discoveryId,
  });
  if (error) throw error;
  return data as string;
}

export async function discardEventDiscovery(discoveryId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("ambassador_discard_event_discovery", {
    p_discovery_id: discoveryId,
  });
  if (error) throw error;
}

type EventDiscoveryPatch = {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string | null;
  address?: string | null;
  external_link?: string | null;
  cover_image_url?: string | null;
};

export async function updateEventDiscovery(
  discoveryId: string,
  patch: EventDiscoveryPatch,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("embassy_event_discoveries")
    .update(patch)
    .eq("id", discoveryId);
  if (error) throw error;
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
