// Milestones — the four badges an ambassador can earn (roadmap 3.3).
//
// Backed by sync_my_ambassador_milestones() (20271195000000_embassy_milestones.sql),
// which judges every milestone against the same get_my_ambassador_impact() numbers
// /embassy/impact renders, stamps newly-earned ones into the ambassador_milestones
// ledger, and announces each exactly once as a 'milestone_earned' notification.
//
// Thresholds live in SQL, not here: the RPC returns target + progress per milestone so
// the UI can never disagree with the rule that actually awards the badge. This module
// owns the copy and nothing else.

import { supabase } from "@/integrations/supabase/client";

export type MilestoneKey = "first_contribution" | "photos_10" | "moderations_50" | "streak_4";

export type Milestone = {
  key: MilestoneKey;
  label: string;
  description: string;
  /** Threshold, from the database. */
  target: number;
  /** Live count toward the threshold — keeps moving after the badge is earned. */
  progress: number;
  /** ISO timestamp of when it was first earned, or null while it is still out of reach. */
  earnedAt: string | null;
};

const MILESTONE_COPY: Record<MilestoneKey, { label: string; description: string }> = {
  first_contribution: {
    label: "First contribution",
    description: "Your first edit, photo, visit, or moderation.",
  },
  photos_10: {
    label: "10 photos",
    description: "Ten photos added to buildings.",
  },
  moderations_50: {
    label: "50 moderations",
    description: "Fifty contributions reviewed.",
  },
  streak_4: {
    label: "4-week streak",
    description: "Four weeks in a row with a contribution.",
  },
};

const isMilestoneKey = (key: string): key is MilestoneKey => key in MILESTONE_COPY;

/**
 * Evaluate, award, and read back the caller's milestones in one round-trip.
 *
 * This writes (it stamps the ledger and may insert a notification), but it is idempotent
 * by construction — `ON CONFLICT DO NOTHING` means a second call awards nothing — so it
 * is safe to call from a query on every Embassy visit.
 */
export async function syncMyMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase.rpc("sync_my_ambassador_milestones");
  if (error) throw error;

  return (data ?? [])
    .filter((row) => isMilestoneKey(row.milestone_key))
    .map((row) => {
      const key = row.milestone_key as MilestoneKey;
      return {
        key,
        ...MILESTONE_COPY[key],
        target: row.milestone_target,
        progress: row.milestone_progress,
        earnedAt: row.earned_at,
      };
    });
}

/**
 * Pure formatter: earned badges first (oldest first, so the shelf reads as a history),
 * then the unearned ones by how close they are — whatever is nearly won sits at the
 * front, which is the only ordering that answers "what should I do next?".
 * Exported for unit testing.
 */
export function sortMilestones(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    if (a.earnedAt && b.earnedAt) return a.earnedAt.localeCompare(b.earnedAt);
    if (a.earnedAt) return -1;
    if (b.earnedAt) return 1;
    return b.progress / b.target - a.progress / a.target;
  });
}
