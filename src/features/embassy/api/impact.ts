// My impact — self-scoped totals, weekly streak, and timeline for the
// ambassador's own contributions (roadmap 3.1).
//
// Backed by get_my_ambassador_impact(), which unions all 8 contribution
// sources get_my_ambassador_goals() already knows how to count (see
// 20271185000000_embassy_my_impact.sql) into one row: all-time totals per
// type, a weekly streak (server-computed), and a recent timeline as jsonb.

import { supabase } from "@/integrations/supabase/client";

const IMPACT_TIMELINE_LIMIT = 30;

export type ImpactMetric =
  | "edits"
  | "photos"
  | "visits"
  | "firms_claimed"
  | "moderation"
  | "outreach"
  | "events"
  | "research";

export type ImpactTotals = Record<ImpactMetric, number>;

export type ImpactTimelineEntry = {
  type: ImpactMetric;
  label: string;
  occurredAt: string;
};

export type MyImpact = {
  totals: ImpactTotals;
  weeklyStreak: number;
  timeline: ImpactTimelineEntry[];
};

const EMPTY_IMPACT: MyImpact = {
  totals: {
    edits: 0,
    photos: 0,
    visits: 0,
    firms_claimed: 0,
    moderation: 0,
    outreach: 0,
    events: 0,
    research: 0,
  },
  weeklyStreak: 0,
  timeline: [],
};

export async function fetchMyImpact(): Promise<MyImpact> {
  const { data, error } = await supabase.rpc("get_my_ambassador_impact", {
    p_timeline_limit: IMPACT_TIMELINE_LIMIT,
  });
  if (error) throw error;

  const row = data?.[0];
  if (!row) return EMPTY_IMPACT;

  return {
    totals: {
      edits: row.edits_count,
      photos: row.photos_count,
      visits: row.visits_count,
      firms_claimed: row.firms_claimed_count,
      moderation: row.moderation_count,
      outreach: row.outreach_count,
      events: row.events_count,
      research: row.research_count,
    },
    weeklyStreak: row.weekly_streak,
    timeline: Array.isArray(row.timeline) ? (row.timeline as ImpactTimelineEntry[]) : [],
  };
}

const METRIC_LABELS: Record<ImpactMetric, string> = {
  edits: "Edits made",
  photos: "Photos added",
  visits: "Buildings visited",
  firms_claimed: "Firms claimed",
  moderation: "Buildings moderated",
  outreach: "Firms reached out to",
  events: "Events published",
  research: "Research applied",
};

// Fixed order used only to break ties between equal counts, so the card grid
// doesn't reshuffle between renders.
const METRIC_ORDER: ImpactMetric[] = [
  "edits",
  "photos",
  "visits",
  "moderation",
  "outreach",
  "events",
  "research",
  "firms_claimed",
];

export type ImpactSummary = {
  metric: ImpactMetric;
  label: string;
  count: number;
};

/**
 * Pure formatter: turn raw totals into display-ready, count-sorted rows.
 * Zero-count metrics are kept (these are lifetime totals, not a backlog of
 * things to do — "Firms claimed: 0" is honest, not noise). Exported for unit
 * testing.
 */
export function summarizeImpactTotals(totals: ImpactTotals): ImpactSummary[] {
  return METRIC_ORDER.map((metric) => ({
    metric,
    label: METRIC_LABELS[metric],
    count: totals[metric],
  })).sort((a, b) => b.count - a.count || METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric));
}
