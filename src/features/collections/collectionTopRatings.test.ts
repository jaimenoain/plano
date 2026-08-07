import { describe, it, expect } from "vitest";
import { buildStatsMap, buildTopRatingMap, type CollectionStatRow } from "./collectionTopRatings";

function row(overrides: Partial<CollectionStatRow> = {}): CollectionStatRow {
  return {
    building_id: "b-1",
    user_id: "u-1",
    status: null,
    rating: null,
    ...overrides,
  };
}

describe("buildTopRatingMap", () => {
  it("returns an empty map for undefined input", () => {
    expect(buildTopRatingMap(undefined).size).toBe(0);
  });

  it("returns an empty map when every row has a null or zero rating", () => {
    const rows = [row({ rating: null }), row({ user_id: "u-2", rating: 0 })];
    expect(buildTopRatingMap(rows).size).toBe(0);
  });

  it("picks the highest rating per building", () => {
    const rows = [
      row({ user_id: "u-1", rating: 1 }),
      row({ user_id: "u-2", rating: 3 }),
      row({ user_id: "u-3", rating: 2 }),
    ];
    const map = buildTopRatingMap(rows);
    expect(map.get("b-1")).toEqual({ userId: "u-2", rating: 3 });
  });

  it("breaks ties deterministically by the lower user id", () => {
    const rows = [
      row({ user_id: "u-9", rating: 3 }),
      row({ user_id: "u-2", rating: 3 }),
      row({ user_id: "u-5", rating: 3 }),
    ];
    const map = buildTopRatingMap(rows);
    expect(map.get("b-1")).toEqual({ userId: "u-2", rating: 3 });
  });

  it("is independent of row order", () => {
    const rowsA = [row({ user_id: "u-2", rating: 3 }), row({ user_id: "u-9", rating: 3 })];
    const rowsB = [row({ user_id: "u-9", rating: 3 }), row({ user_id: "u-2", rating: 3 })];
    expect(buildTopRatingMap(rowsA)).toEqual(buildTopRatingMap(rowsB));
  });

  it("keeps buildings separate", () => {
    const rows = [
      row({ building_id: "b-1", user_id: "u-1", rating: 2 }),
      row({ building_id: "b-2", user_id: "u-2", rating: 1 }),
    ];
    const map = buildTopRatingMap(rows);
    expect(map.get("b-1")).toEqual({ userId: "u-1", rating: 2 });
    expect(map.get("b-2")).toEqual({ userId: "u-2", rating: 1 });
  });
});

describe("buildStatsMap", () => {
  it("returns an empty map for undefined input", () => {
    expect(buildStatsMap(undefined).size).toBe(0);
  });

  it("aggregates visited count, max rating and hasSaved per building", () => {
    const rows = [
      row({ user_id: "u-1", status: "visited", rating: 1 }),
      row({ user_id: "u-2", status: "pending", rating: 3 }),
      row({ user_id: "u-3", status: "visited", rating: null }),
    ];
    const stat = buildStatsMap(rows).get("b-1");
    expect(stat).toEqual({ visitedCount: 2, maxRating: 3, hasSaved: true });
  });
});
