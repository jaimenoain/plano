// "Start here" task queue — the top-of-dashboard aggregator.
//
// Reduces the five existing contribution queues (see taskFeed.ts) to 3–5
// concrete, ready-to-do tasks, ranked by the ambassador's saved tool preference
// and, as a tiebreak, chapter backlog size. Reuses the per-queue fetchers
// verbatim — no new RPC, no new task types.

import { normalizeToolPreferences, type ToolKey } from "@/features/embassy/toolPreferences";
import {
  fetchAmbassadorBuildingsWithoutPhotos,
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorUnclaimedFirms,
  fetchBuildingResearchQueue,
  fetchPendingEventDiscoveries,
  type AmbassadorBuildingNoPhoto,
  type AmbassadorRecentBuilding,
  type AmbassadorUnclaimedFirm,
  type BuildingResearchQueueItem,
  type EventDiscovery,
} from "@/features/embassy/api/taskFeed";

// The task's tool — a subset of ToolKey that has an actionable Contribute queue
// (community is a link-out to /connect, so it never produces a task here).
export type StartHereToolKey = "research" | "curation" | "photography" | "outreach" | "events";

export type StartHereTask = {
  id: string; // stable per source item, prefixed by tool so ids never collide
  toolKey: StartHereToolKey;
  title: string; // the surfaced item's name (building / firm / event)
  context: string; // one line: what to do
  href: string; // deep-link into the tool (item ranked first on arrival)
  backlogCount: number; // items available in that queue (approximate; capped by the probe)
};

// How many items to probe per queue when deriving the backlog hint. Kept small —
// this runs on dashboard load and we only render the top item of each queue.
const START_HERE_PROBE_LIMIT = 20;

/**
 * Pure ranker: order candidate tasks by saved tool preference (first), then by
 * backlog size (larger first), and cap at 5. Exported for unit testing.
 * `preferredTools` is the raw `ambassador_memberships.preferred_tools` value;
 * it is normalized here (legacy `moderation` → `curation`, unknowns dropped).
 */
export function rankStartHereTasks(
  candidates: StartHereTask[],
  preferredTools: string[] | null | undefined,
): StartHereTask[] {
  const order = normalizeToolPreferences(preferredTools);
  const rankOf = (key: StartHereToolKey): number => {
    const i = order.indexOf(key as ToolKey);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  // Array.prototype.sort is stable (ES2019+), so equal-rank ties keep input order.
  return [...candidates]
    .sort((a, b) => {
      const byPref = rankOf(a.toolKey) - rankOf(b.toolKey);
      if (byPref !== 0) return byPref;
      return b.backlogCount - a.backlogCount;
    })
    .slice(0, 5);
}

/**
 * Fetch the five contribution queues in parallel and reduce each to its single
 * highest-priority task, then rank. A queue that errors is skipped rather than
 * failing the whole feed — a broken sub-queue must not blank the dashboard.
 */
export async function fetchStartHereTasks(
  chapterId: string,
  preferredTools: string[] | null | undefined,
): Promise<StartHereTask[]> {
  const [research, moderation, photoGaps, firms, events] = await Promise.all([
    fetchBuildingResearchQueue(chapterId).catch(() => [] as BuildingResearchQueueItem[]),
    fetchAmbassadorRecentBuildings(chapterId).catch(() => [] as AmbassadorRecentBuilding[]),
    fetchAmbassadorBuildingsWithoutPhotos(chapterId, START_HERE_PROBE_LIMIT).catch(
      () => [] as AmbassadorBuildingNoPhoto[],
    ),
    fetchAmbassadorUnclaimedFirms(chapterId, START_HERE_PROBE_LIMIT).catch(
      () => [] as AmbassadorUnclaimedFirm[],
    ),
    fetchPendingEventDiscoveries(chapterId).catch(() => [] as EventDiscovery[]),
  ]);

  const candidates: StartHereTask[] = [];

  if (research.length > 0) {
    candidates.push({
      id: `research:${research[0].id}`,
      toolKey: "research",
      title: research[0].building_name,
      context: "Review AI-gathered research and apply what's correct.",
      href: "/embassy/contribute?tool=research",
      backlogCount: research.length,
    });
  }

  if (moderation.length > 0) {
    candidates.push({
      id: `curation:${moderation[0].id}`,
      toolKey: "curation",
      title: moderation[0].name,
      context: "New building awaiting moderation before it goes live.",
      href: "/embassy/contribute?tool=curation",
      backlogCount: moderation.length,
    });
  }

  if (photoGaps.length > 0) {
    candidates.push({
      id: `photography:${photoGaps[0].id}`,
      toolKey: "photography",
      title: photoGaps[0].name,
      context: "A notable building in your chapter still has no photo.",
      href: "/embassy/contribute?tool=photography",
      backlogCount: photoGaps.length,
    });
  }

  if (firms.length > 0) {
    const firm = firms[0];
    const count = firm.building_count ?? 0;
    candidates.push({
      id: `outreach:${firm.id}`,
      toolKey: "outreach",
      title: firm.name,
      context:
        count > 0
          ? `Unclaimed firm with ${count} building${count === 1 ? "" : "s"} — reach out.`
          : "Unclaimed firm — reach out to help them claim their portfolio.",
      href: "/embassy/contribute?tool=outreach",
      backlogCount: firms.length,
    });
  }

  if (events.length > 0) {
    candidates.push({
      id: `events:${events[0].id}`,
      toolKey: "events",
      title: events[0].title,
      context: "AI found an architecture event — review, edit, and publish it.",
      href: "/embassy/contribute?tool=events",
      backlogCount: events.length,
    });
  }

  return rankStartHereTasks(candidates, preferredTools);
}
