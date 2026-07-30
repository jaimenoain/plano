import { describe, expect, it } from "vitest";
import { formatDistance, nextRadiusAfter, FIELD_RADII_METERS } from "./fieldMode";

describe("formatDistance", () => {
  it("uses metres below a kilometre", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(79)).toBe("79 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("rounds metres to whole numbers — nobody walks to a decimetre", () => {
    expect(formatDistance(78.6)).toBe("79 m");
  });

  it("switches to kilometres at 1000 m, without false precision", () => {
    expect(formatDistance(1000)).toBe("1 km");
    expect(formatDistance(2000)).toBe("2 km");
    expect(formatDistance(1449)).toBe("1.4 km");
    expect(formatDistance(15500)).toBe("15.5 km");
  });

  it("degrades to a dash rather than printing NaN", () => {
    expect(formatDistance(Number.NaN)).toBe("—");
    expect(formatDistance(-1)).toBe("—");
  });
});

describe("nextRadiusAfter", () => {
  it("steps up the ladder", () => {
    expect(nextRadiusAfter(FIELD_RADII_METERS[0])).toBe(FIELD_RADII_METERS[1]);
  });

  it("returns null at the widest step, so the UI stops offering to widen", () => {
    expect(nextRadiusAfter(FIELD_RADII_METERS[FIELD_RADII_METERS.length - 1])).toBeNull();
  });

  it("returns null for a radius that is not on the ladder", () => {
    expect(nextRadiusAfter(1234)).toBeNull();
  });
});
