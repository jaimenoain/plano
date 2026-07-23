import { supabase } from "@/integrations/supabase/client";

// Latest row of embassy_event_search_runs for a chapter — the server marks a
// run "failed" with error "serper_not_configured" when SERPER_API_KEY is
// missing, which is how the Events tool distinguishes "still searching" from
// "search can never succeed" (see api/event-search.route.ts).
export interface EventSearchRun {
  status: string;
  error: string | null;
  started_at: string;
}

export async function fetchLatestEventSearchRun(
  chapterId: string,
): Promise<EventSearchRun | null> {
  const { data, error } = await supabase
    .from("embassy_event_search_runs")
    .select("status, error, started_at")
    .eq("chapter_id", chapterId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type EventSearchHealth = "ok" | "unavailable" | "failed";

export function deriveEventSearchHealth(
  run: EventSearchRun | null | undefined,
): EventSearchHealth {
  if (!run || run.status !== "failed") return "ok";
  return run.error === "serper_not_configured" ? "unavailable" : "failed";
}
