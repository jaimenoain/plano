import type { WeeklyDigestMetadata, WeeklyDigestTasks } from "./types";

/**
 * One-line summary for a `weekly_digest` notification row.
 *
 * Deliberately total: the payload is written server-side and older rows may be missing
 * keys, so every branch has to degrade to something readable rather than "undefined
 * contributions" or "NaN tasks".
 */

function toInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** "12 tasks" / "1 task" / "285+ tasks" — the "+" marks a capped (floor) count. */
export function formatTaskCount(tasks: WeeklyDigestTasks | undefined | null): string {
  const total = toInt(tasks?.total);
  return tasks?.capped ? `${total}+ tasks` : plural(total, "task");
}

export function formatWeeklyDigestSummary(
  digest: WeeklyDigestMetadata | undefined | null,
): string {
  const chapter =
    typeof digest?.chapterName === "string" && digest.chapterName.trim().length > 0
      ? digest.chapterName.trim()
      : "your chapter";

  const yourTotal = toInt(digest?.you?.total);
  const chapterTotal = toInt(digest?.chapter?.total);
  const tasks = formatTaskCount(digest?.tasks);

  const yours =
    yourTotal === 0
      ? `You logged nothing in ${chapter} this week`
      : `${plural(yourTotal, "contribution")} from you in ${chapter} this week`;

  return `${yours} · ${chapterTotal} from the chapter · ${tasks} waiting`;
}
