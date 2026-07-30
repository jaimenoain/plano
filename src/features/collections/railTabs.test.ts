import { describe, expect, it } from "vitest";
import { railTabCount, resolveRailTab, shouldShowRailTabs } from "./railTabs";

const ctx = (hasItinerary: boolean, discoveryEnabled: boolean) => ({
  hasItinerary,
  discoveryEnabled,
});

describe("resolveRailTab", () => {
  it("keeps a tab that is on offer", () => {
    expect(resolveRailTab("items", ctx(true, true))).toBe("items");
    expect(resolveRailTab("itinerary", ctx(true, true))).toBe("itinerary");
    expect(resolveRailTab("discover", ctx(true, true))).toBe("discover");
  });

  it("falls back to items when discovery is switched off underneath Discover", () => {
    expect(resolveRailTab("discover", ctx(true, false))).toBe("items");
    expect(resolveRailTab("discover", ctx(false, false))).toBe("items");
  });

  it("falls back to items when the itinerary is gone", () => {
    expect(resolveRailTab("itinerary", ctx(false, true))).toBe("items");
  });

  it("leaves items alone whatever is on offer", () => {
    expect(resolveRailTab("items", ctx(false, false))).toBe("items");
  });
});

describe("railTabCount", () => {
  it("counts only the tabs on offer", () => {
    expect(railTabCount(ctx(false, false))).toBe(1);
    expect(railTabCount(ctx(true, false))).toBe(2);
    expect(railTabCount(ctx(false, true))).toBe(2);
    expect(railTabCount(ctx(true, true))).toBe(3);
  });
});

describe("shouldShowRailTabs", () => {
  it("draws the strip only when there is somewhere else to go", () => {
    expect(shouldShowRailTabs(ctx(false, false))).toBe(false);
    expect(shouldShowRailTabs(ctx(true, false))).toBe(true);
    expect(shouldShowRailTabs(ctx(false, true))).toBe(true);
  });
});
