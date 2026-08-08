import { describe, expect, it } from "vitest";
import { DISCOVER_PAGE_SIZE, discoverInViewRpcArgs } from "./discoverInView";

const bounds = { north: 51.6, south: 51.2, east: 0.3, west: -0.5 };

describe("discoverInViewRpcArgs", () => {
  it("maps each compass edge to its own RPC argument", () => {
    // A transposition here would return plausible buildings from the wrong place,
    // which is exactly the kind of bug that survives a visual check.
    const args = discoverInViewRpcArgs(bounds, 1);
    expect(args.min_lat).toBe(bounds.south);
    expect(args.max_lat).toBe(bounds.north);
    expect(args.min_lng).toBe(bounds.west);
    expect(args.max_lng).toBe(bounds.east);
  });

  it("passes the page through and asks for a full page", () => {
    expect(discoverInViewRpcArgs(bounds, 3).page).toBe(3);
    expect(discoverInViewRpcArgs(bounds, 3).page_size).toBe(DISCOVER_PAGE_SIZE);
  });

  it("sends no filters, matching what the discovery pin layer draws", () => {
    expect(discoverInViewRpcArgs(bounds, 1).filter_criteria).toEqual({});
  });

  // Task 5.7 — quality-tier / era / standard filters for "Show All Buildings".
  it("carries the tier and era filters through to filter_criteria", () => {
    const args = discoverInViewRpcArgs(bounds, 1, { minTierRank: "Top 5%", centuries: [19, 20] });
    expect(args.filter_criteria).toMatchObject({
      min_tier_rank: "Top 5%",
      centuries: [19, 20],
    });
  });

  it("carries the standard building filters through to filter_criteria", () => {
    const args = discoverInViewRpcArgs(bounds, 1, {
      category: "cat-1",
      typologies: ["typ-1"],
      constructionStatuses: ["Built"],
      awardId: "award-1",
      minSizeSqm: 100,
    });
    expect(args.filter_criteria).toMatchObject({
      category_id: "cat-1",
      typology_ids: ["typ-1"],
      construction_statuses: ["Built"],
      award_id: "award-1",
      min_size_sqm: 100,
    });
  });

  it("omits keys for unset filters rather than sending them as null/undefined", () => {
    const args = discoverInViewRpcArgs(bounds, 1, { minTierRank: "Top 1%" });
    expect(args.filter_criteria).toEqual({ min_tier_rank: "Top 1%" });
  });
});
