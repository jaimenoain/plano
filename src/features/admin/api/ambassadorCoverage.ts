import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AdminAmbassadorLocalityCoverageRow =
  Database["public"]["Functions"]["get_admin_ambassador_locality_coverage"]["Returns"][number];

export type AdminAmbassadorProgramStatsRow =
  Database["public"]["Functions"]["get_admin_ambassador_program_stats"]["Returns"][number];

export type ChapterMetricsRow =
  Database["public"]["Functions"]["get_chapter_metrics"]["Returns"][number];

export type ChapterActivityRow =
  Database["public"]["Functions"]["get_chapter_ambassador_activity"]["Returns"][number];

export type ChapterRecentBuildingRow =
  Database["public"]["Functions"]["get_ambassador_recent_buildings"]["Returns"][number];

export type ChapterBuildingWithoutPhotoRow =
  Database["public"]["Functions"]["get_ambassador_buildings_without_photos"]["Returns"][number];

export type ChapterBuildingMissingMetaRow =
  Database["public"]["Functions"]["get_ambassador_buildings_missing_metadata"]["Returns"][number];

export type NationalChapterOverviewRow =
  Database["public"]["Functions"]["get_national_chapter_overview"]["Returns"][number];

export async function fetchAdminAmbassadorLocalityCoverage(): Promise<AdminAmbassadorLocalityCoverageRow[]> {
  const { data, error } = await supabase.rpc("get_admin_ambassador_locality_coverage");
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminAmbassadorProgramStats(): Promise<AdminAmbassadorProgramStatsRow | null> {
  const { data, error } = await supabase.rpc("get_admin_ambassador_program_stats");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchChapterMetrics(chapterId: string, days = 30): Promise<ChapterMetricsRow | null> {
  const { data, error } = await supabase.rpc("get_chapter_metrics", {
    p_chapter_id: chapterId,
    p_days: days,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function fetchChapterActivity(chapterId: string, days = 30): Promise<ChapterActivityRow[]> {
  const { data, error } = await supabase.rpc("get_chapter_ambassador_activity", {
    p_chapter_id: chapterId,
    p_days: days,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapterRecentBuildings(chapterId: string, limit = 10): Promise<ChapterRecentBuildingRow[]> {
  const { data, error } = await supabase.rpc("get_ambassador_recent_buildings", {
    p_chapter_id: chapterId,
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapterBuildingsWithoutPhotos(chapterId: string, limit = 20): Promise<ChapterBuildingWithoutPhotoRow[]> {
  const { data, error } = await supabase.rpc("get_ambassador_buildings_without_photos", {
    p_chapter_id: chapterId,
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapterBuildingsMissingMeta(chapterId: string, limit = 20): Promise<ChapterBuildingMissingMetaRow[]> {
  const { data, error } = await supabase.rpc("get_ambassador_buildings_missing_metadata", {
    p_chapter_id: chapterId,
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchNationalChapterOverview(nationalChapterId: string): Promise<NationalChapterOverviewRow[]> {
  const { data, error } = await supabase.rpc("get_national_chapter_overview", {
    p_national_chapter_id: nationalChapterId,
  });
  if (error) throw error;
  return data ?? [];
}

export interface PeriodCount { current: number; previous: number }

export async function fetchChapterNewBuildings(
  chapter: { type: string; locality_id: string | null; country_code: string },
  days = 30,
): Promise<PeriodCount> {
  const now = Date.now();
  const msDay = 86_400_000;
  const periodStart = new Date(now - days * msDay).toISOString();
  const prevStart = new Date(now - 2 * days * msDay).toISOString();

  let localityIds: string[] = [];
  if (chapter.type === "local" && chapter.locality_id) {
    localityIds = [chapter.locality_id];
  } else if (chapter.type === "national") {
    const { data } = await supabase
      .from("localities")
      .select("id")
      .eq("country_code", chapter.country_code);
    localityIds = (data ?? []).map((l) => l.id);
  }

  if (localityIds.length === 0) return { current: 0, previous: 0 };

  const [cur, prev] = await Promise.all([
    supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .in("locality_id", localityIds)
      .gte("created_at", periodStart),
    supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .in("locality_id", localityIds)
      .gte("created_at", prevStart)
      .lt("created_at", periodStart),
  ]);

  return { current: cur.count ?? 0, previous: prev.count ?? 0 };
}

export async function fetchChapterNewCredits(
  chapterId: string,
  days = 30,
): Promise<PeriodCount> {
  const now = Date.now();
  const msDay = 86_400_000;
  const periodStart = new Date(now - days * msDay).toISOString();
  const prevStart = new Date(now - 2 * days * msDay).toISOString();

  const { data: members } = await supabase
    .from("ambassador_memberships")
    .select("user_id")
    .eq("chapter_id", chapterId)
    .eq("status", "active");

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return { current: 0, previous: 0 };

  const [cur, prev] = await Promise.all([
    supabase
      .from("building_credits")
      .select("id", { count: "exact", head: true })
      .in("added_by_user_id", userIds)
      .gte("created_at", periodStart),
    supabase
      .from("building_credits")
      .select("id", { count: "exact", head: true })
      .in("added_by_user_id", userIds)
      .gte("created_at", prevStart)
      .lt("created_at", periodStart),
  ]);

  return { current: cur.count ?? 0, previous: prev.count ?? 0 };
}

export async function fetchUserChapterActivity(
  chapterId: string,
  userId: string,
  days = 30,
): Promise<ChapterActivityRow | null> {
  const rows = await fetchChapterActivity(chapterId, days);
  return rows.find((r) => r.user_id === userId) ?? null;
}
