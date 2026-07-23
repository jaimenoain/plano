import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Content flagged from the embassy Moderation tool. reported_id carries the
// content id and content_type says which table it lives in — the admin
// /admin/moderation queue reads both (see migration 20271182000000).
export type FlaggedContentType = "building" | "photo" | "video" | "credit";

type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

export function buildFlagReportRow(params: {
  reporterId: string;
  contentType: FlaggedContentType;
  contentId: string;
  reasonLabel: string;
  label: string;
}): ReportInsert {
  return {
    reporter_id: params.reporterId,
    reported_id: params.contentId,
    content_type: params.contentType,
    reason: params.reasonLabel,
    details: params.label,
    status: "pending",
  };
}

export async function flagContentForAdminReview(params: {
  contentType: FlaggedContentType;
  contentId: string;
  reasonLabel: string;
  label: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("reports")
    .insert(buildFlagReportRow({ reporterId: user.id, ...params }));
  if (error) throw error;
}
