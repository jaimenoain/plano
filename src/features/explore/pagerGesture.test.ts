/**
 * The one invariant that matters here: a gesture moves exactly one building.
 * The bug this replaces let a single iPad flick carry across three or four cards,
 * each of which was then written off as `ignored` and lost from Explore for good.
 */
import { describe, it, expect } from "vitest";
import {
  PAGER_VELOCITY_PX,
  applyEdgeResistance,
  clamp,
  computePagerThresholds,
  resolvePagerCommit,
} from "./pagerGesture";

describe("computePagerThresholds", () => {
  it("scales with feed height", () => {
    expect(computePagerThresholds(800).offset).toBeCloseTo(120);
  });

  it("clamps so short phones and tall tablets both stay usable", () => {
    expect(computePagerThresholds(200).offset).toBe(56);
    expect(computePagerThresholds(4000).offset).toBe(160);
  });
});

describe("resolvePagerCommit", () => {
  const thresholds = computePagerThresholds(800); // offset 120

  it("advances when the drag pulls the next card up past the threshold", () => {
    expect(resolvePagerCommit(-140, 0, thresholds)).toBe("next");
  });

  it("goes back when the drag pulls downward past the threshold", () => {
    expect(resolvePagerCommit(140, 0, thresholds)).toBe("prev");
  });

  it("springs back when the drag falls short and there is no fling", () => {
    expect(resolvePagerCommit(-100, 0, thresholds)).toBe("none");
    expect(resolvePagerCommit(100, 0, thresholds)).toBe("none");
    expect(resolvePagerCommit(0, 0, thresholds)).toBe("none");
  });

  it("commits on a fast flick even when the finger barely moved", () => {
    expect(resolvePagerCommit(-20, -(PAGER_VELOCITY_PX + 1), thresholds)).toBe(
      "next"
    );
    expect(resolvePagerCommit(20, PAGER_VELOCITY_PX + 1, thresholds)).toBe(
      "prev"
    );
  });

  it("never reports more than one step, however violent the flick", () => {
    // The regression: iOS momentum from a hard flick used to carry the feed across
    // several cards. A commit is a direction, not a distance — 10x the threshold and
    // 20x the velocity still resolve to a single step.
    const violent = resolvePagerCommit(-1200, -9000, thresholds);
    expect(violent).toBe("next");
    expect(["next", "prev", "none"]).toContain(violent);
  });
});

describe("applyEdgeResistance", () => {
  it("tracks the finger one-to-one within the edge limit", () => {
    expect(applyEdgeResistance(30)).toBe(30);
    expect(applyEdgeResistance(-30)).toBe(-30);
  });

  it("damps the overpull so the feed never exposes empty space", () => {
    const pulled = applyEdgeResistance(248);
    expect(pulled).toBeGreaterThan(48);
    expect(pulled).toBeLessThan(248);
    expect(applyEdgeResistance(-248)).toBeCloseTo(-pulled);
  });
});

describe("clamp", () => {
  it("bounds a value to the range", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
