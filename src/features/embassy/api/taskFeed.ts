import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const EMBASSY_TASK_FEED_LIMIT = 20;

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
    p_limit: EMBASSY_TASK_FEED_LIMIT,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAmbassadorUnclaimedFirms(
  chapterId: string,
): Promise<AmbassadorUnclaimedFirm[]> {
  const { data, error } = await supabase.rpc("get_ambassador_unclaimed_firms", {
    p_chapter_id: chapterId,
    p_limit: EMBASSY_TASK_FEED_LIMIT,
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
