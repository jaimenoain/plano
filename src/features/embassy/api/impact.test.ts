import { describe, expect, it } from "vitest";
import { summarizeImpactTotals, type ImpactTotals } from "./impact";

const ZERO_TOTALS: ImpactTotals = {
  edits: 0,
  photos: 0,
  visits: 0,
  firms_claimed: 0,
  moderation: 0,
  outreach: 0,
  events: 0,
  research: 0,
};

describe("summarizeImpactTotals", () => {
  it("keeps every metric even when all totals are zero", () => {
    const summary = summarizeImpactTotals(ZERO_TOTALS);
    expect(summary).toHaveLength(8);
    expect(summary.every((s) => s.count === 0)).toBe(true);
  });

  it("sorts metrics by count, highest first", () => {
    const summary = summarizeImpactTotals({ ...ZERO_TOTALS, photos: 3, edits: 40, visits: 12 });
    expect(summary.slice(0, 3).map((s) => s.metric)).toEqual(["edits", "visits", "photos"]);
  });

  it("breaks ties by the fixed metric order, not insertion order", () => {
    const summary = summarizeImpactTotals({ ...ZERO_TOTALS, outreach: 5, photos: 5 });
    const tied = summary.filter((s) => s.count === 5).map((s) => s.metric);
    expect(tied).toEqual(["photos", "outreach"]);
  });

  it("maps each metric to a human-readable label", () => {
    const summary = summarizeImpactTotals({ ...ZERO_TOTALS, firms_claimed: 2 });
    const firms = summary.find((s) => s.metric === "firms_claimed");
    expect(firms?.label).toBe("Firms claimed");
  });
});
