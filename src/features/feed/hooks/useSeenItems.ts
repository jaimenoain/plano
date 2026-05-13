import { useCallback, useMemo, useRef } from "react";
import {
  flushNoteViews,
  queueNoteView,
} from "@/features/feed/utils/noteViewTracker";

export interface UseSeenItemsApi {
  /** Record that the viewer has seen `id`. Idempotent; debounced flush to `track_note_views`. */
  markSeen: (id: string) => void;
  /** True if `markSeen(id)` was called earlier in this session. */
  hasSeen: (id: string) => boolean;
  /** Force the pending batch to flush now (e.g. on tab hide). */
  flush: () => Promise<void>;
}

/**
 * Session-scoped "seen items" register.
 *
 * Wraps the existing `track_note_views` RPC via `noteViewTracker.queueNoteView`
 * plus an in-memory `Set<string>` that lives as long as the hook caller stays
 * mounted. The set drives `hasSeen(id)` which the Phase 1 ranker's
 * `seen_penalty` signal consumes from `scoreFeedItem`.
 *
 * The existing `useTrackNoteView` (IntersectionObserver dwell tracker) keeps
 * its imperative role — it decides *when* something counts as seen. This hook
 * is the read/write surface the ranker reads from.
 */
export function useSeenItems(): UseSeenItemsApi {
  const seenRef = useRef<Set<string>>(new Set());

  const markSeen = useCallback((id: string) => {
    if (!id) return;
    if (seenRef.current.has(id)) return;
    seenRef.current.add(id);
    queueNoteView(id);
  }, []);

  const hasSeen = useCallback((id: string) => {
    if (!id) return false;
    return seenRef.current.has(id);
  }, []);

  const flush = useCallback(() => flushNoteViews(), []);

  return useMemo(
    () => ({ markSeen, hasSeen, flush }),
    [markSeen, hasSeen, flush],
  );
}
