import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { queueNoteView } from "../utils/noteViewTracker";

/**
 * Attach to a card's outer element to record one "view" per note per session.
 *
 * - Self-views are skipped (we never count a user looking at their own note).
 * - Anonymous viewers (no auth) are skipped — the `track_note_views` RPC
 *   would no-op anyway, but skipping client-side avoids the round-trip.
 * - Threshold 0.5 + 250ms dwell prevents fly-by views during fast scrolls.
 *
 * Returns a setter ref — pass to the card's root element.
 */
export function useTrackNoteView(noteId: string, ownerId: string | undefined) {
  const { user } = useAuth();
  const elementRef = useRef<HTMLElement | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reported = useRef(false);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  useEffect(() => {
    if (!user || !noteId) return;
    if (ownerId && ownerId === user.id) return;
    const node = elementRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    reported.current = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !reported.current) {
          if (dwellTimer.current != null) return;
          dwellTimer.current = setTimeout(() => {
            dwellTimer.current = null;
            if (reported.current) return;
            reported.current = true;
            queueNoteView(noteId);
          }, 250);
        } else if (!entry.isIntersecting) {
          if (dwellTimer.current != null) {
            clearTimeout(dwellTimer.current);
            dwellTimer.current = null;
          }
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (dwellTimer.current != null) {
        clearTimeout(dwellTimer.current);
        dwellTimer.current = null;
      }
    };
  }, [noteId, ownerId, user]);

  return setRef;
}
