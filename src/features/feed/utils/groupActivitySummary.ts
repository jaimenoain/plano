import { isSameDay } from "date-fns";
import { hasReviewMedia, resolveCardType } from "@/features/posts/utils/resolveCardType";
import type { FeedEventAttendance, FeedHomeEntry, FeedReview } from "@/types/feed";

/** Minimum number of consecutive "light" visits before they collapse into a summary row. */
export const ACTIVITY_SUMMARY_MIN = 3;

/** Max compact activity rows shown before the rest collapse behind "Show more". */
export const COMPACT_RUN_VISIBLE = 4;

/**
 * Home-feed row after {@link groupHomeFeedEntries}: either a passthrough entry or a
 * collapsed run of consecutive "light" visits (no text, no media) by the same user.
 */
export type HomeFeedRenderItem =
  | { kind: "entry"; entry: FeedHomeEntry }
  | { kind: "activity-summary"; key: string; entries: FeedReview[] };

/**
 * Render block after {@link collapseCompactRuns}: either a single passthrough item or a
 * `compact-run` wrapping a long run of consecutive compact activity rows so the UI can show
 * the first {@link COMPACT_RUN_VISIBLE} and collapse the rest behind "Show more".
 */
export type HomeFeedRenderBlock =
  | { kind: "item"; item: HomeFeedRenderItem }
  | { kind: "compact-run"; key: string; items: HomeFeedRenderItem[] };

function isEventAttendanceEntry(entry: FeedHomeEntry): entry is FeedEventAttendance {
  return "rowType" in entry && entry.rowType === "event_attendance";
}

/**
 * Returns a copy of `entries` with the first media-bearing entry (photo or video) moved to
 * the front, preserving the relative order of everything else. If no entry has media, the
 * original order is returned unchanged. Event-attendance rows never count as media.
 */
export function promoteFirstMediaEntry<T extends FeedHomeEntry>(entries: T[]): T[] {
  const idx = entries.findIndex(
    (e) => !isEventAttendanceEntry(e) && hasReviewMedia(e as FeedReview),
  );
  if (idx <= 0) return entries; // already first, or none found
  const next = entries.slice();
  const [media] = next.splice(idx, 1);
  next.unshift(media);
  return next;
}

/** A "light" update: a review-shaped entry that resolves to the activity card (no text, no media). */
function isLightActivity(entry: FeedHomeEntry): entry is FeedReview {
  return !isEventAttendanceEntry(entry) && resolveCardType(entry) === "activity";
}

/** A "large" entry renders as the full-width editorial post (card type A/B/C), not a compact row. */
function isLargeEntry(entry: FeedHomeEntry): entry is FeedReview {
  return !isEventAttendanceEntry(entry) && resolveCardType(entry) !== "activity";
}

function isLargeNoMedia(entry: FeedHomeEntry): boolean {
  return isLargeEntry(entry) && !hasReviewMedia(entry);
}

function isLargeWithMedia(entry: FeedHomeEntry): boolean {
  return isLargeEntry(entry) && hasReviewMedia(entry);
}

/**
 * Returns a copy of `entries` with no two consecutive "large" (non-activity) entries both
 * lacking media. Whenever a text-only entry would land directly after another text-only
 * entry, the nearest later media-bearing large entry is pulled forward to sit between them.
 * If no later media entry is available, the pair is left as-is. Preserves the relative order
 * of everything else; event-attendance rows are never treated as large.
 */
export function spaceOutNoMediaLargeEntries<T extends FeedHomeEntry>(entries: T[]): T[] {
  const next = entries.slice();
  for (let i = 1; i < next.length; i++) {
    if (!isLargeNoMedia(next[i]) || !isLargeNoMedia(next[i - 1])) continue;
    const donorIdx = next.findIndex((e, j) => j > i && isLargeWithMedia(e));
    if (donorIdx === -1) continue; // no later media entry to pull forward
    const [media] = next.splice(donorIdx, 1);
    next.splice(i, 0, media);
  }
  return next;
}

/**
 * Whether two consecutive light visits belong in the same summary: same author, same
 * status (so the verb is consistent), and the same calendar day.
 */
function sameRun(a: FeedReview, b: FeedReview): boolean {
  return (
    a.user_id === b.user_id &&
    a.status === b.status &&
    isSameDay(new Date(a.created_at), new Date(b.created_at))
  );
}

/**
 * Collapses consecutive runs of {@link ACTIVITY_SUMMARY_MIN}+ "light" visits (same user,
 * status and day) into a single `activity-summary` row. Shorter runs and every other entry
 * pass through unchanged, preserving the original (recency-desc) order.
 */
export function groupHomeFeedEntries(entries: FeedHomeEntry[]): HomeFeedRenderItem[] {
  const out: HomeFeedRenderItem[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i];

    if (!isLightActivity(entry)) {
      out.push({ kind: "entry", entry });
      i += 1;
      continue;
    }

    // Extend the run while consecutive light visits share user/status/day.
    const run: FeedReview[] = [entry];
    let j = i + 1;
    while (j < entries.length) {
      const next = entries[j];
      if (!isLightActivity(next) || !sameRun(run[run.length - 1], next)) break;
      run.push(next);
      j += 1;
    }

    if (run.length >= ACTIVITY_SUMMARY_MIN) {
      out.push({ kind: "activity-summary", key: `activity-${run[0].id}`, entries: run });
    } else {
      run.forEach((e) => out.push({ kind: "entry", entry: e }));
    }
    i = j;
  }

  return out;
}

/**
 * A "compact" render row: an already-collapsed per-person summary, or a single light-activity
 * entry (no text, no media). These are the rows whose visual density {@link collapseCompactRuns}
 * caps. Event-attendance and rich text/media entries are not compact.
 */
function isCompactRenderItem(item: HomeFeedRenderItem): boolean {
  if (item.kind === "activity-summary") return true;
  return !isEventAttendanceEntry(item.entry) && resolveCardType(item.entry) === "activity";
}

function renderItemKey(item: HomeFeedRenderItem): string {
  return item.kind === "activity-summary" ? item.key : item.entry.id;
}

/**
 * Second pass over {@link groupHomeFeedEntries} output: runs of more than
 * {@link COMPACT_RUN_VISIBLE} consecutive compact activity rows are wrapped into a single
 * `compact-run` block; everything else (including shorter compact runs) passes through as a plain
 * `item`. Preserves the original order.
 */
export function collapseCompactRuns(items: HomeFeedRenderItem[]): HomeFeedRenderBlock[] {
  const out: HomeFeedRenderBlock[] = [];
  let i = 0;

  while (i < items.length) {
    if (!isCompactRenderItem(items[i])) {
      out.push({ kind: "item", item: items[i] });
      i += 1;
      continue;
    }

    // Extend the run while consecutive items stay compact.
    let j = i + 1;
    while (j < items.length && isCompactRenderItem(items[j])) j += 1;
    const run = items.slice(i, j);

    if (run.length > COMPACT_RUN_VISIBLE) {
      out.push({ kind: "compact-run", key: `compact-run-${renderItemKey(run[0])}`, items: run });
    } else {
      run.forEach((item) => out.push({ kind: "item", item }));
    }
    i = j;
  }

  return out;
}
