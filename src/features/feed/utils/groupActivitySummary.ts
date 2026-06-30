import { isSameDay } from "date-fns";
import { resolveCardType } from "@/features/posts/utils/resolveCardType";
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

/** A "light" update: a review-shaped entry that resolves to the activity card (no text, no media). */
function isLightActivity(entry: FeedHomeEntry): entry is FeedReview {
  return !isEventAttendanceEntry(entry) && resolveCardType(entry) === "activity";
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
