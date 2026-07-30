import { describe, expect, it } from "vitest";
import { sortMilestones, type Milestone } from "./milestones";

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    key: "photos_10",
    label: "10 photos",
    description: "Ten photos added to buildings.",
    target: 10,
    progress: 0,
    earnedAt: null,
    ...overrides,
  };
}

describe("sortMilestones", () => {
  it("returns an empty list unchanged", () => {
    expect(sortMilestones([])).toEqual([]);
  });

  it("puts earned milestones ahead of unearned ones", () => {
    const sorted = sortMilestones([
      milestone({ key: "photos_10", progress: 9, target: 10 }),
      milestone({ key: "streak_4", progress: 4, target: 4, earnedAt: "2026-07-01T00:00:00Z" }),
    ]);
    expect(sorted.map((m) => m.key)).toEqual(["streak_4", "photos_10"]);
  });

  it("orders earned milestones oldest first, so the shelf reads as a history", () => {
    const sorted = sortMilestones([
      milestone({ key: "photos_10", earnedAt: "2026-07-20T00:00:00Z" }),
      milestone({ key: "first_contribution", earnedAt: "2026-06-01T00:00:00Z" }),
      milestone({ key: "streak_4", earnedAt: "2026-07-05T00:00:00Z" }),
    ]);
    expect(sorted.map((m) => m.key)).toEqual(["first_contribution", "streak_4", "photos_10"]);
  });

  it("orders unearned milestones by how close they are, not by raw count", () => {
    const sorted = sortMilestones([
      // 20 of 50 = 40%, a bigger number but further away than 9 of 10.
      milestone({ key: "moderations_50", progress: 20, target: 50 }),
      milestone({ key: "photos_10", progress: 9, target: 10 }),
    ]);
    expect(sorted.map((m) => m.key)).toEqual(["photos_10", "moderations_50"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      milestone({ key: "photos_10", progress: 1 }),
      milestone({ key: "streak_4", earnedAt: "2026-07-01T00:00:00Z" }),
    ];
    sortMilestones(input);
    expect(input.map((m) => m.key)).toEqual(["photos_10", "streak_4"]);
  });
});
