import { supabase } from "@/integrations/supabase/client";

/**
 * Module-level batcher for note-view events.
 *
 * Each tab keeps two sets:
 *   - `pending`: ids queued for the next RPC flush.
 *   - `tracked`: ids that have already been successfully recorded in this tab,
 *      so re-scrolling the same card past the viewport doesn't re-fire.
 *
 * Why module-level: cards mount/unmount as the user scrolls — a per-component
 * dedupe set would forget what's already been sent. The Set lives as long as
 * the page does, which matches the "one view per session" UX.
 *
 * Self-views are *also* filtered server-side (see `track_note_views` RPC), so
 * the client filter is just to save a round-trip.
 */

const FLUSH_DELAY_MS = 1500;
/** Hard cap on a single RPC payload to keep request size predictable. */
const MAX_BATCH_SIZE = 100;

const pending = new Set<string>();
const tracked = new Set<string>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<void> | null = null;

interface NoteViewClient {
  rpc: (
    fn: "track_note_views",
    args: { p_note_ids: string[] },
  ) => Promise<{ error: { message: string } | null }>;
}

let client: NoteViewClient = supabase as unknown as NoteViewClient;

/** Test-only: swap the Supabase client for a stub so unit tests don't hit the network. */
export function __setNoteViewClient(stub: NoteViewClient | null): void {
  client = (stub ?? (supabase as unknown as NoteViewClient));
}

/** Test-only: reset module-level state between tests. */
export function __resetNoteViewTracker(): void {
  pending.clear();
  tracked.clear();
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushInFlight = null;
}

/** Queue a note id to be reported as viewed on the next flush. Idempotent. */
export function queueNoteView(noteId: string): void {
  if (!noteId) return;
  if (tracked.has(noteId) || pending.has(noteId)) return;
  pending.add(noteId);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushNoteViews();
  }, FLUSH_DELAY_MS);
}

/**
 * Send pending ids to the RPC. On failure, ids are re-queued so a later flush
 * can retry — view counts are best-effort and shouldn't block the UI, but we
 * also don't want to silently drop everything on a transient network blip.
 */
export async function flushNoteViews(): Promise<void> {
  if (flushInFlight) return flushInFlight;
  if (pending.size === 0) return;

  const batch = Array.from(pending).slice(0, MAX_BATCH_SIZE);
  batch.forEach((id) => pending.delete(id));

  flushInFlight = (async () => {
    try {
      const { error } = await client.rpc("track_note_views", { p_note_ids: batch });
      if (error) {
        batch.forEach((id) => pending.add(id));
        return;
      }
      batch.forEach((id) => tracked.add(id));
    } catch {
      batch.forEach((id) => pending.add(id));
    } finally {
      flushInFlight = null;
      if (pending.size > 0) scheduleFlush();
    }
  })();

  return flushInFlight;
}

if (typeof window !== "undefined") {
  /** Best-effort flush when the tab is hidden so a partial scroll session is still recorded. */
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pending.size > 0) {
      void flushNoteViews();
    }
  });
}
