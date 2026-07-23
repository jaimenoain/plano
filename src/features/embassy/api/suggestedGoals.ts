// Suggested goal chips — turns the same chapter backlog that powers the "Start
// here" queue into one-click goal suggestions, replacing the blank-form-first
// flow on /embassy/goals. Reuses the taskFeed.ts fetchers verbatim (see
// startHere.ts for the same pattern) — no new RPC.

import {
  fetchAmbassadorBuildingsWithoutPhotos,
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorUnclaimedFirms,
  fetchBuildingResearchQueue,
  fetchPendingEventDiscoveries,
} from "@/features/embassy/api/taskFeed";

// How many items to probe the outreach queue for — its default fetch limit
// (EMBASSY_SEARCH_FEED_LIMIT = 500) is sized for the full Contribute tool list,
// not a single-goal target. Mirrors startHere.ts's own probe cap.
const SUGGESTED_GOAL_OUTREACH_PROBE_LIMIT = 20;

// The four backlog-derived metrics get_my_ambassador_goals() can count, beyond
// the original edits/photos/visits/firms_claimed set. edits/visits have no
// backlog queue, so they're never suggested — only reachable via the manual form.
export type SuggestedGoalMetric = "research" | "moderation" | "photos" | "outreach" | "events";

export type SuggestedGoal = {
  metric: SuggestedGoalMetric;
  title: string;
  target: number;
};

export type BacklogCounts = {
  research: number;
  moderation: number;
  photos: number;
  outreach: number;
  events: number;
};

/**
 * Pure builder: turn backlog counts into suggested goals. A queue with zero
 * items never produces a chip. Exported for unit testing.
 */
export function buildSuggestedGoals(counts: BacklogCounts): SuggestedGoal[] {
  const suggestions: SuggestedGoal[] = [];

  if (counts.research > 0) {
    suggestions.push({
      metric: "research",
      title: `Review ${counts.research} pending research item${counts.research === 1 ? "" : "s"}`,
      target: counts.research,
    });
  }
  if (counts.moderation > 0) {
    suggestions.push({
      metric: "moderation",
      title: `Moderate ${counts.moderation} pending building${counts.moderation === 1 ? "" : "s"}`,
      target: counts.moderation,
    });
  }
  if (counts.photos > 0) {
    suggestions.push({
      metric: "photos",
      title: `Upload ${counts.photos} missing photo${counts.photos === 1 ? "" : "s"}`,
      target: counts.photos,
    });
  }
  if (counts.outreach > 0) {
    suggestions.push({
      metric: "outreach",
      title: `Reach out to ${counts.outreach} unclaimed firm${counts.outreach === 1 ? "" : "s"}`,
      target: counts.outreach,
    });
  }
  if (counts.events > 0) {
    suggestions.push({
      metric: "events",
      title: `Publish ${counts.events} pending event${counts.events === 1 ? "" : "s"}`,
      target: counts.events,
    });
  }

  return suggestions;
}

/**
 * Fetch the same five contribution queues startHere.ts uses, reduce each to a
 * backlog count, and build suggested goals. A queue that errors counts as 0
 * rather than failing the whole feed.
 */
export async function fetchSuggestedGoals(chapterId: string): Promise<SuggestedGoal[]> {
  const [research, moderation, photos, outreach, events] = await Promise.all([
    fetchBuildingResearchQueue(chapterId).catch(() => []),
    fetchAmbassadorRecentBuildings(chapterId).catch(() => []),
    fetchAmbassadorBuildingsWithoutPhotos(chapterId).catch(() => []),
    fetchAmbassadorUnclaimedFirms(chapterId, SUGGESTED_GOAL_OUTREACH_PROBE_LIMIT).catch(() => []),
    fetchPendingEventDiscoveries(chapterId).catch(() => []),
  ]);

  return buildSuggestedGoals({
    research: research.length,
    moderation: moderation.length,
    photos: photos.length,
    outreach: outreach.length,
    events: events.length,
  });
}
