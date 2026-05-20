import { supabase } from "@/integrations/supabase/client";
import type {
  ProgrammeHealthSummary,
  ProgrammePulse,
  ProgrammeActivityDay,
  FlaggedChapter,
  TopChapter,
  ChapterFlagType,
} from "@/features/admin/types/programme";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

function parsePulse(raw: unknown): ProgrammePulse {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    activeChapters:        num(o.active_chapters),
    formingChapters:       num(o.forming_chapters),
    inactiveChapters:      num(o.inactive_chapters),
    activeChaptersDelta:   num(o.active_chapters_delta),
    formingChaptersDelta:  num(o.forming_chapters_delta),
    inactiveChaptersDelta: num(o.inactive_chapters_delta),
    pendingApplications:   num(o.pending_applications),
    staleApplications:     num(o.stale_applications),
  };
}

function parseActivityTrend(raw: unknown): ProgrammeActivityDay[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      date:   String(row.date ?? ""),
      edits:  num(row.edits),
      photos: num(row.photos),
    };
  });
}

function parseFlaggedChapters(raw: unknown): FlaggedChapter[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      chapterId:   String(row.chapter_id ?? ""),
      chapterName: String(row.chapter_name ?? ""),
      countryCode: String(row.country_code ?? ""),
      flagType:    (row.flag_type as ChapterFlagType) ?? "no_president",
      flagDetail:  row.flag_detail != null ? String(row.flag_detail) : null,
    };
  });
}

function parseTopChapters(raw: unknown): TopChapter[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      chapterId:         String(row.chapter_id ?? ""),
      chapterName:       String(row.chapter_name ?? ""),
      countryCode:       String(row.country_code ?? ""),
      memberCount:       num(row.member_count),
      contributionCount: num(row.contribution_count),
    };
  });
}

export async function fetchProgrammeHealthSummary(): Promise<ProgrammeHealthSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_programme_health_summary");
  if (error) throw new Error(error.message);
  const d = data as Record<string, unknown>;
  return {
    pulse:            parsePulse(d.pulse),
    activityTrend:    parseActivityTrend(d.activity_trend),
    flaggedChapters:  parseFlaggedChapters(d.flagged_chapters),
    topChapters:      parseTopChapters(d.top_chapters),
  };
}
