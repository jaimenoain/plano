import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  STATUS_LABELS,
  TYPE_LABELS,
  type FeedbackRow,
  type FeedbackStatus,
} from "@/features/admin/feedback/feedbackTypes";

const FEEDBACK_SELECT = `
  id, type, message, page_url, user_agent, console_errors, metadata, screenshot_path,
  created_at, user_id, status, status_changed_at, outcome_notes, needs_user_input,
  profiles ( username )
`;

function mapRow(raw: Record<string, unknown>): FeedbackRow {
  const consoleErrors = raw.console_errors;
  const metadata = raw.metadata;
  const profiles = raw.profiles;

  return {
    id: raw.id as string,
    type: raw.type as FeedbackRow["type"],
    message: raw.message as string,
    page_url: (raw.page_url as string | null) ?? null,
    user_agent: (raw.user_agent as string | null) ?? null,
    console_errors: Array.isArray(consoleErrors) ? (consoleErrors as string[]) : [],
    metadata: (metadata as Record<string, unknown>) ?? {},
    screenshot_path: (raw.screenshot_path as string | null) ?? null,
    created_at: raw.created_at as string,
    user_id: raw.user_id as string,
    status: (raw.status as FeedbackStatus) ?? "open",
    status_changed_at: (raw.status_changed_at as string | null) ?? null,
    outcome_notes: (raw.outcome_notes as string | null) ?? null,
    needs_user_input: Boolean(raw.needs_user_input),
    profiles: Array.isArray(profiles)
      ? ((profiles[0] as FeedbackRow["profiles"]) ?? null)
      : ((profiles as FeedbackRow["profiles"]) ?? null),
  };
}

export async function loadFeedbackForAdmin(): Promise<{
  rows: FeedbackRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("feedback")
    .select(FEEDBACK_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((r: Record<string, unknown>) => mapRow(r)), error: null };
}

export async function loadFeedbackForTeam(userId: string): Promise<{
  rows: FeedbackRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("feedback")
    .select(FEEDBACK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((r: Record<string, unknown>) => mapRow(r)), error: null };
}

async function shouldDebounceNotification(
  feedbackId: string,
  submitterId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("id, metadata")
    .eq("user_id", submitterId)
    .in("type", ["feedback_status_updated", "feedback_notes_updated"])
    .gte("created_at", cutoff)
    .limit(5);

  if (!data?.length) return false;
  return data.some(
    (n) =>
      typeof n.metadata === "object" &&
      n.metadata !== null &&
      "feedback_id" in n.metadata &&
      (n.metadata as { feedback_id?: string }).feedback_id === feedbackId,
  );
}

async function notifyFeedbackSubmitter(
  feedbackId: string,
  submitterId: string,
  actorId: string,
  patch: { status?: FeedbackStatus; outcome_notes?: string | null },
  feedbackMessage: string,
  feedbackType: FeedbackRow["type"],
): Promise<void> {
  if (await shouldDebounceNotification(feedbackId, submitterId)) return;

  const snippet =
    feedbackMessage.length > 60
      ? `${feedbackMessage.slice(0, 60)}…`
      : feedbackMessage;
  const typeLabel = TYPE_LABELS[feedbackType] ?? "feedback";

  let message: string;
  let type: "feedback_status_updated" | "feedback_notes_updated";

  if (patch.status !== undefined) {
    message = `Your ${typeLabel} was moved to ${STATUS_LABELS[patch.status]} — "${snippet}"`;
    type = "feedback_status_updated";
  } else {
    message = `Outcome notes were added to your ${typeLabel} — "${snippet}"`;
    type = "feedback_notes_updated";
  }

  await supabase.from("notifications").insert({
    user_id: submitterId,
    actor_id: actorId,
    type,
    is_read: false,
    metadata: { feedback_id: feedbackId, message },
  });
}

export async function updateFeedback(
  id: string,
  actorId: string,
  patch: {
    status?: FeedbackStatus;
    outcome_notes?: string | null;
    needs_user_input?: boolean;
  },
): Promise<{ error: string | null }> {
  const shouldNotify =
    patch.status !== undefined || patch.outcome_notes !== undefined;

  let submitterId: string | null = null;
  let feedbackMessage = "";
  let feedbackType: FeedbackRow["type"] = "other";

  if (shouldNotify) {
    const { data } = await supabase
      .from("feedback")
      .select("user_id, message, type")
      .eq("id", id)
      .single();
    if (data) {
      submitterId = data.user_id as string;
      feedbackMessage = data.message as string;
      feedbackType = data.type as FeedbackRow["type"];
    }
  }

  const update: TablesUpdate<"feedback"> = { ...patch };
  if (patch.status !== undefined) {
    update.status_changed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("feedback")
    .update(update)
    .eq("id", id);

  if (error) return { error: error.message };

  if (shouldNotify && submitterId && submitterId !== actorId) {
    await notifyFeedbackSubmitter(
      id,
      submitterId,
      actorId,
      patch,
      feedbackMessage,
      feedbackType,
    );
  }

  return { error: null };
}

export async function reopenFeedback(
  id: string,
  reason: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("reopen_feedback", {
    p_id: id,
    p_reason: reason.trim(),
  });

  if (error) return { error: error.message };
  return { error: null };
}
