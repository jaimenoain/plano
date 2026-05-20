import { supabase } from "@/integrations/supabase/client";
import type {
  ProgrammeHealthSummary,
  ProgrammePulse,
  ProgrammeActivityDay,
  FlaggedChapter,
  TopChapter,
  ChapterFlagType,
  PresidentDirectoryRow,
  ExcoMember,
  InterventionFlag,
  InterventionFlagType,
  InterventionSeverity,
  AdminBroadcast,
  BroadcastType,
  RecipientScope,
  BroadcastReadStatus,
  BroadcastBanner,
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

function parseExcoMembers(raw: unknown): ExcoMember[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      userId:             String(row.user_id ?? ""),
      username:           String(row.username ?? ""),
      avatarUrl:          row.avatar_url != null ? String(row.avatar_url) : null,
      excoResponsibility: row.exco_responsibility != null ? String(row.exco_responsibility) : null,
    };
  });
}

export async function fetchPresidentDirectory(): Promise<PresidentDirectoryRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_president_directory");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    presidentUserId:    String(r.president_user_id ?? ""),
    presidentUsername:  String(r.president_username ?? ""),
    presidentAvatarUrl: r.president_avatar_url != null ? String(r.president_avatar_url) : null,
    chapterId:          String(r.chapter_id ?? ""),
    chapterName:        String(r.chapter_name ?? ""),
    countryCode:        String(r.country_code ?? ""),
    chapterStatus:      String(r.chapter_status ?? ""),
    memberCount:        num(r.member_count),
    lastActiveAt:       r.last_active_at != null ? String(r.last_active_at) : null,
    edits30d:           num(r.edits_30d),
    openApplications:   num(r.open_applications),
    memberSince:        String(r.member_since ?? ""),
    excoMembers:        parseExcoMembers(r.exco_members),
  }));
}

export async function fetchInterventionFlags(): Promise<InterventionFlag[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_programme_intervention_flags");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    flagType:        (r.flag_type as InterventionFlagType) ?? "no_president",
    severity:        (r.severity as InterventionSeverity) ?? "info",
    chapterId:       String(r.chapter_id ?? ""),
    chapterName:     String(r.chapter_name ?? ""),
    countryCode:     String(r.country_code ?? ""),
    description:     String(r.description ?? ""),
    suggestedAction: String(r.suggested_action ?? ""),
    detectedAt:      String(r.detected_at ?? ""),
  }));
}

export async function dismissInterventionFlag(
  flagType: InterventionFlagType,
  entityId: string,
  snoozeDays?: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("dismiss_intervention_flag", {
    p_flag_type:   flagType,
    p_entity_id:   entityId,
    p_snooze_days: snoozeDays ?? null,
  });
  if (error) throw new Error(error.message);
}

// ─── Broadcasts ───────────────────────────────────────────────────────────────

export async function fetchBroadcasts(): Promise<AdminBroadcast[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_admin_broadcasts");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id:             String(r.id ?? ""),
    subject:        String(r.subject ?? ""),
    body:           String(r.body ?? ""),
    type:           (r.type as BroadcastType) ?? "announcement",
    recipientScope: (r.recipient_scope as RecipientScope) ?? "all",
    scopeValue:     r.scope_value != null ? String(r.scope_value) : null,
    sentByUsername: String(r.sent_by_username ?? ""),
    sentAt:         String(r.sent_at ?? ""),
    pinned:         Boolean(r.pinned),
    recipientCount: num(r.recipient_count),
    readCount:      num(r.read_count),
  }));
}

export async function sendBroadcast(params: {
  subject: string;
  body: string;
  type: BroadcastType;
  recipientScope: RecipientScope;
  scopeValue?: string | null;
}): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("send_admin_broadcast", {
    p_subject:          params.subject,
    p_body:             params.body,
    p_type:             params.type,
    p_recipient_scope:  params.recipientScope,
    p_scope_value:      params.scopeValue ?? null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function toggleBroadcastPin(broadcastId: string, pinned: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("toggle_broadcast_pin", {
    p_broadcast_id: broadcastId,
    p_pinned:       pinned,
  });
  if (error) throw new Error(error.message);
}

export async function fetchBroadcastReadStatus(broadcastId: string): Promise<BroadcastReadStatus[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_broadcast_read_status", {
    p_broadcast_id: broadcastId,
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    chapterId:         String(r.chapter_id ?? ""),
    chapterName:       String(r.chapter_name ?? ""),
    presidentUsername: String(r.president_username ?? ""),
    presidentUserId:   String(r.president_user_id ?? ""),
    readAt:            r.read_at != null ? String(r.read_at) : null,
  }));
}

export async function fetchBroadcastBanners(): Promise<BroadcastBanner[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_ambassador_broadcast_banners");
  if (error) return [];
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id:       String(r.id ?? ""),
    subject:  String(r.subject ?? ""),
    body:     String(r.body ?? ""),
    type:     (r.type as BroadcastType) ?? "announcement",
    sentAt:   String(r.sent_at ?? ""),
    isPinned: Boolean(r.is_pinned),
  }));
}

export async function markBroadcastRead(broadcastId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("mark_broadcast_read", {
    p_broadcast_id: broadcastId,
  });
  if (error) throw new Error(error.message);
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
