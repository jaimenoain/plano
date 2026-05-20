import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChapterMetricsRow =
  Database["public"]["Functions"]["get_chapter_metrics"]["Returns"][number];

export type ChapterAmbassadorActivityRow =
  Database["public"]["Functions"]["get_chapter_ambassador_activity"]["Returns"][number];

export type ChapterMemberContactRow =
  Database["public"]["Functions"]["get_chapter_members_with_contact"]["Returns"][number];

export type NationalChapterOverviewRow =
  Database["public"]["Functions"]["get_national_chapter_overview"]["Returns"][number];

export async function fetchNationalChapterOverview(
  nationalChapterId: string,
): Promise<NationalChapterOverviewRow[]> {
  const { data, error } = await supabase.rpc("get_national_chapter_overview", {
    p_national_chapter_id: nationalChapterId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapterMetrics(
  chapterId: string,
  days: number,
): Promise<ChapterMetricsRow | null> {
  const { data, error } = await supabase.rpc("get_chapter_metrics", {
    p_chapter_id: chapterId,
    p_days: days,
  });
  if (error) throw error;
  const row = data?.[0];
  return row ?? null;
}

export async function fetchChapterAmbassadorActivity(
  chapterId: string,
  days: number,
): Promise<ChapterAmbassadorActivityRow[]> {
  const { data, error } = await supabase.rpc("get_chapter_ambassador_activity", {
    p_chapter_id: chapterId,
    p_days: days,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapterMembersWithContact(
  chapterId: string,
): Promise<ChapterMemberContactRow[]> {
  const { data, error } = await supabase.rpc("get_chapter_members_with_contact", {
    p_chapter_id: chapterId,
  });
  if (error) throw error;
  return data ?? [];
}

export interface ChapterTeamMember {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  exco_responsibility: string | null;
  joined_at: string;
}

export async function fetchChapterTeam(
  chapterId: string,
): Promise<ChapterTeamMember[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_chapter_team", {
    p_chapter_id: chapterId,
  });
  if (error) throw error;
  return (data ?? []) as ChapterTeamMember[];
}

export async function presidentInviteMember(args: {
  chapterId: string;
  userId: string;
  role: "ambassador" | "exco";
  excoResponsibility: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("president_invite_ambassador_member", {
    p_chapter_id: args.chapterId,
    p_user_id: args.userId,
    p_role: args.role,
    p_exco_responsibility: args.excoResponsibility,
  });
  if (error) throw error;
}

export async function presidentUpdateMembership(args: {
  membershipId: string;
  role: string | null;
  excoResponsibility: string | null;
  status: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("president_update_chapter_membership", {
    p_membership_id: args.membershipId,
    p_role: args.role,
    p_exco_responsibility: args.excoResponsibility,
    p_status: args.status,
  });
  if (error) throw error;
}
