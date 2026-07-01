import { describe, it, expect } from "vitest";
import {
  applyElasticPull,
  computeElasticLimit,
  computeRotationDeg,
  computeStampOpacity,
  computeSwipeThresholds,
  computeVelocity,
  decideAxis,
  resolveSwipeCommit,
  BASE_ELASTIC_LIMIT,
  ELASTIC_DAMPING,
  ROTATION_MAX_DEG,
} from "./swipeGesture";

describe("computeSwipeThresholds", () => {
  it("clamps to the phone-friendly minimum (88px)", () => {
    expect(computeSwipeThresholds(375).offset).toBe(88); // 375*0.18=67.5 -> 88 floor
  });
  it("clamps to the tablet-friendly maximum (180px)", () => {
    expect(computeSwipeThresholds(1440).offset).toBe(180); // 1440*0.18=259 -> 180 ceil
  });
  it("scales linearly at 18% of width between the clamps", () => {
    expect(computeSwipeThresholds(800).offset).toBeCloseTo(144); // 800*0.18
  });
  it("returns the constant velocity threshold", () => {
    expect(computeSwipeThresholds(375).velocity).toBe(480);
  });
});

describe("applyElasticPull", () => {
  it("passes through unchanged below the limit", () => {
    expect(applyElasticPull(150)).toBe(150);
    expect(applyElasticPull(-150)).toBe(-150);
    expect(applyElasticPull(BASE_ELASTIC_LIMIT)).toBe(BASE_ELASTIC_LIMIT);
  });
  it("damps the overshoot beyond the limit with correct sign", () => {
    // 250 -> 200 + (50 * 0.32) = 216
    expect(applyElasticPull(250)).toBeCloseTo(200 + 50 * ELASTIC_DAMPING);
    expect(applyElasticPull(-250)).toBeCloseTo(-(200 + 50 * ELASTIC_DAMPING));
  });
  it("honours a width-scaled limit", () => {
    const limit = computeElasticLimit(600); // 300
    expect(applyElasticPull(300, limit)).toBe(300);
    expect(applyElasticPull(400, limit)).toBeCloseTo(300 + 100 * ELASTIC_DAMPING);
  });
});

describe("computeElasticLimit", () => {
  it("never drops below the phone baseline", () => {
    expect(computeElasticLimit(375)).toBe(200); // 375*0.5=187.5 -> 200 floor
  });
  it("scales with width above the baseline", () => {
    expect(computeElasticLimit(600)).toBe(300);
  });
});

describe("computeRotationDeg", () => {
  it("reproduces the original ±200px -> ±10deg range on a phone card", () => {
    expect(computeRotationDeg(200, 375)).toBeCloseTo(ROTATION_MAX_DEG);
    expect(computeRotationDeg(-200, 375)).toBeCloseTo(-ROTATION_MAX_DEG);
    expect(computeRotationDeg(100, 375)).toBeCloseTo(5); // half pull -> half tilt
  });
  it("caps at the max degrees", () => {
    expect(computeRotationDeg(9999, 375)).toBe(ROTATION_MAX_DEG);
    expect(computeRotationDeg(-9999, 375)).toBe(-ROTATION_MAX_DEG);
  });
  it("needs a proportionally larger pull on a wider card", () => {
    // 600px card -> span 320, so 200px pull is well under full tilt
    expect(computeRotationDeg(200, 600)).toBeLessThan(ROTATION_MAX_DEG);
  });
});

describe("computeStampOpacity", () => {
  it("reproduces the original ±20px -> ±100px reveal window on a phone card", () => {
    expect(computeStampOpacity(20, 375, "like")).toBeCloseTo(0);
    expect(computeStampOpacity(100, 375, "like")).toBeCloseTo(1);
    expect(computeStampOpacity(60, 375, "like")).toBeCloseTo(0.5);
  });
  it("mirrors for the nope direction on negative pull", () => {
    expect(computeStampOpacity(-20, 375, "nope")).toBeCloseTo(0);
    expect(computeStampOpacity(-100, 375, "nope")).toBeCloseTo(1);
  });
  it("stays clamped to [0,1]", () => {
    expect(computeStampOpacity(-200, 375, "like")).toBe(0);
    expect(computeStampOpacity(9999, 375, "like")).toBe(1);
  });
});

describe("decideAxis", () => {
  it("stays undecided within the 8px dead zone", () => {
    expect(decideAxis({ dx: 5, dy: 5, pointerType: "touch" })).toBe("undecided");
  });
  it("locks vertical when vertical dominates (touch)", () => {
    expect(decideAxis({ dx: 5, dy: 30, pointerType: "touch" })).toBe("vertical");
  });
  it("requires strong horizontal dominance on touch (1.7 ratio, 32px arm)", () => {
    // 30px horizontal, 10px vertical: 30 < arm 32 -> not yet horizontal
    expect(decideAxis({ dx: 30, dy: 10, pointerType: "touch" })).toBe("undecided");
    // 40px horizontal, 20px vertical: 40>=32 and 40 > 20*1.7(=34) -> horizontal
    expect(decideAxis({ dx: 40, dy: 20, pointerType: "touch" })).toBe("horizontal");
  });
  it("uses looser arms/ratios for a mouse pointer (12px arm, 1.2 ratio)", () => {
    expect(decideAxis({ dx: 15, dy: 10, pointerType: "mouse" })).toBe("horizontal");
    expect(decideAxis({ dx: 10, dy: 15, pointerType: "mouse" })).toBe("vertical");
  });
});

describe("computeVelocity", () => {
  it("returns 0 with fewer than two samples", () => {
    expect(computeVelocity([{ t: 0, x: 0 }])).toBe(0);
  });
  it("returns 0 when the span is within the dt gate", () => {
    // 10ms span, default 40ms gate
    expect(computeVelocity([{ t: 0, x: 0 }, { t: 10, x: 50 }])).toBe(0);
  });
  it("computes px/s once past the gate", () => {
    // 100px over 100ms -> 1000 px/s
    expect(computeVelocity([{ t: 0, x: 0 }, { t: 100, x: 100 }])).toBeCloseTo(1000);
  });
  it("registers a fast short flick with a lowered gate", () => {
    // 40px over 20ms with a 16ms gate -> 2000 px/s (dead under the old 40ms gate)
    expect(computeVelocity([{ t: 0, x: 0 }, { t: 20, x: 40 }], 0.016)).toBeCloseTo(2000);
  });
});

describe("resolveSwipeCommit", () => {
  const thresholds = { offset: 100, velocity: 480 };
  it("commits right past the offset", () => {
    expect(resolveSwipeCommit(120, 0, thresholds)).toBe("right");
  });
  it("commits left past the negative offset", () => {
    expect(resolveSwipeCommit(-120, 0, thresholds)).toBe("left");
  });
  it("commits on velocity even under the offset", () => {
    expect(resolveSwipeCommit(40, 600, thresholds)).toBe("right");
    expect(resolveSwipeCommit(-40, -600, thresholds)).toBe("left");
  });
  it("does not commit a small slow drag", () => {
    expect(resolveSwipeCommit(40, 100, thresholds)).toBe("none");
  });
});
