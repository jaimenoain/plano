/**
 * mapNoticePreferences.ts
 *
 * Client-side dismissal state for the map's "No buildings in this area" notice.
 *
 * The notice is a nudge, not information the user must keep seeing, so dismissing
 * it suppresses it for 24 hours rather than forever — the same time-decayed shape
 * as `useVersionNotification`. We store the *expiry* rather than the dismissal
 * moment so a read is a single comparison and a clock change can only ever
 * un-suppress, never extend.
 *
 * This lives in `localStorage`, never the DB: it is a viewing preference of one
 * reader on one device. Every access is wrapped — private mode and quota errors
 * must never take the map down — and any failure reads as "not dismissed", so the
 * worst case is that the user sees the notice again.
 *
 * `now` is injected by the caller so the behaviour is testable without fake timers.
 */

const EMPTY_NOTICE_DISMISSED_UNTIL = "plano:map:empty-notice-dismissed-until" as const;

/** How long a dismissal holds. */
export const EMPTY_NOTICE_DISMISS_MS = 24 * 60 * 60 * 1000;

/** True only when a stored expiry is still in the future. Absent, malformed or unreadable → false. */
export function readEmptyNoticeDismissed(now: number): boolean {
  try {
    const raw = localStorage.getItem(EMPTY_NOTICE_DISMISSED_UNTIL);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

/** Suppress the notice for the next {@link EMPTY_NOTICE_DISMISS_MS}. */
export function writeEmptyNoticeDismissed(now: number): void {
  try {
    localStorage.setItem(EMPTY_NOTICE_DISMISSED_UNTIL, String(now + EMPTY_NOTICE_DISMISS_MS));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Test/reset helper — clears the dismissal outright. */
export function clearEmptyNoticeDismissed(): void {
  try {
    localStorage.removeItem(EMPTY_NOTICE_DISMISSED_UNTIL);
  } catch {
    /* ignore */
  }
}
