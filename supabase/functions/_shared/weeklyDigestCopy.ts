// Pure copy helpers for the embassy weekly digest email (Roadmap 3.2).
//
// Deliberately free of Deno APIs and esm.sh imports so vitest can import it directly
// (same arrangement as _shared/routing.ts). Everything here is a pure function of the
// payload written by public.compute_weekly_digest_payloads.

export interface DigestCounts {
  edits?: number;
  photos?: number;
  visits?: number;
  moderation?: number;
  outreach?: number;
  events?: number;
  research?: number;
  firmsClaimed?: number;
  total?: number;
  activeMembers?: number;
}

export interface DigestTasks {
  research?: number;
  curation?: number;
  photography?: number;
  outreach?: number;
  events?: number;
  total?: number;
  capped?: boolean;
}

export interface WeeklyDigestPayload {
  weekStart?: string;
  weekEnd?: string;
  chapterId?: string;
  chapterName?: string;
  you?: DigestCounts;
  chapter?: DigestCounts;
  tasks?: DigestTasks;
}

export interface DigestRow {
  label: string;
  count: number;
}

/** Contribution metrics, in the order they read best in an email. */
const CONTRIBUTION_LABELS: [keyof DigestCounts, string][] = [
  ["edits", "Edits made"],
  ["photos", "Photos added"],
  ["visits", "Buildings visited"],
  ["moderation", "Buildings moderated"],
  ["research", "Research applied"],
  ["outreach", "Firms reached out to"],
  ["events", "Events published"],
  ["firmsClaimed", "Firms claimed"],
];

/** Backlog queues, matching the tool names on /embassy/contribute. */
const TASK_LABELS: [keyof DigestTasks, string][] = [
  ["photography", "Buildings missing photos"],
  ["outreach", "Unclaimed firms"],
  ["curation", "New buildings to review"],
  ["research", "Research suggestions"],
  ["events", "Event discoveries"],
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

/** Rows with a non-zero count, in display order. Zero rows are noise in an email. */
export function digestRows(counts: DigestCounts | undefined | null): DigestRow[] {
  const source = counts ?? {};
  return CONTRIBUTION_LABELS.map(([key, label]) => ({ label, count: toInt(source[key]) }))
    .filter((row) => row.count > 0);
}

export function taskRows(tasks: DigestTasks | undefined | null): DigestRow[] {
  const source = tasks ?? {};
  return TASK_LABELS.map(([key, label]) => ({ label, count: toInt(source[key]) }))
    .filter((row) => row.count > 0);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

/**
 * "12 tasks" / "1 task" / "285+ tasks" — the "+" appears when the backlog count hit its
 * cap in _digest_chapter_backlog, so the number is a floor rather than an exact count.
 */
export function formatTasksLabel(tasks: DigestTasks | undefined | null): string {
  const total = toInt(tasks?.total);
  if (tasks?.capped) return `${total}+ tasks`;
  return pluralize(total, "task");
}

/**
 * "21–27 July" within a month, "28 July – 3 August" across one. `weekEnd` from the
 * payload is exclusive (week_start + 7), so the label shows the last *included* day.
 */
export function formatWeekLabel(weekStart?: string | null, weekEnd?: string | null): string {
  const start = parseIsoDate(weekStart);
  if (!start) return "this week";

  const exclusiveEnd = parseIsoDate(weekEnd);
  const end = exclusiveEnd
    ? new Date(exclusiveEnd.getTime() - 24 * 60 * 60 * 1000)
    : new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = MONTHS[start.getUTCMonth()];
  const endMonth = MONTHS[end.getUTCMonth()];

  return startMonth === endMonth && start.getUTCFullYear() === end.getUTCFullYear()
    ? `${startDay}–${endDay} ${endMonth}`
    : `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function digestSubject(chapterName: string): string {
  return `Your week in ${chapterName} — Plano`;
}

export function chapterName(payload: WeeklyDigestPayload | undefined | null): string {
  const name = payload?.chapterName;
  return typeof name === "string" && name.trim().length > 0 ? name.trim() : "your chapter";
}

/** The <Preview> line and the in-app notification text share this sentence. */
export function digestPreviewLine(payload: WeeklyDigestPayload | undefined | null): string {
  const chapter = chapterName(payload);
  const yourTotal = toInt(payload?.you?.total);
  const tasks = formatTasksLabel(payload?.tasks);

  return yourTotal === 0
    ? `Nothing logged in ${chapter} this week — ${tasks} waiting.`
    : `${pluralize(yourTotal, "contribution")} in ${chapter} this week — ${tasks} waiting.`;
}
