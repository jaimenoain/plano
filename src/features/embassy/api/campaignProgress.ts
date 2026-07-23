import { supabase } from "@/integrations/supabase/client";

export interface CampaignProgressInput {
  start_date: string;
  end_date: string;
  metric_type: string;
}

async function fetchActiveMemberUserIds(chapterId: string): Promise<string[]> {
  const { data } = await supabase
    .from("ambassador_memberships")
    .select("user_id")
    .eq("chapter_id", chapterId)
    .eq("status", "active");
  return (data ?? []).map((m: { user_id: string }) => m.user_id);
}

export async function fetchCampaignProgress(
  campaign: CampaignProgressInput,
  chapterId: string,
): Promise<number> {
  const { start_date, end_date, metric_type } = campaign;
  const endTs = end_date + "T23:59:59Z";

  const userIds = await fetchActiveMemberUserIds(chapterId);
  if (!userIds.length) return 0;

  if (metric_type === "photos") {
    const { count } = await supabase
      .from("review_images")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  if (metric_type === "edits") {
    const { count } = await supabase
      .from("building_audit_logs")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds)
      .gte("created_at", start_date)
      .lte("created_at", endTs);
    return count ?? 0;
  }

  // outreach — outreach_log.ambassador_id stores profile/user ids, not
  // membership ids (see 20271115000000_fix_outreach_log_ambassador_fk_to_profiles.sql)
  const { count } = await supabase
    .from("outreach_log")
    .select("id", { count: "exact", head: true })
    .in("ambassador_id", userIds)
    .gte("created_at", start_date)
    .lte("created_at", endTs);
  return count ?? 0;
}
