import { describe, it, expect } from "vitest";
import {
  BUILDING_HERO_MIN_WIDTH_PX,
  isBuildingHeroEligibleSize,
  pickFirstHeroEligibleStoragePath,
} from "@/lib/building-hero-image";

describe("building hero image eligibility", () => {
  it("requires width >= min, landscape", () => {
    expect(isBuildingHeroEligibleSize(1000, 500)).toBe(true);
    expect(isBuildingHeroEligibleSize(999, 500)).toBe(false);
    expect(isBuildingHeroEligibleSize(1200, 1200)).toBe(false);
    expect(isBuildingHeroEligibleSize(1200, 1300)).toBe(false);
  });

  it("rejects unknown dimensions", () => {
    expect(isBuildingHeroEligibleSize(null, 800)).toBe(false);
    expect(isBuildingHeroEligibleSize(1200, null)).toBe(false);
  });

  it("picks first row in popularity order that qualifies", () => {
    const rows = [
      { storage_path: "a.jpg", width_px: 800, height_px: 600 },
      { storage_path: "b.jpg", width_px: 1200, height_px: 800 },
      { storage_path: "c.jpg", width_px: 1400, height_px: 900 },
    ];
    expect(pickFirstHeroEligibleStoragePath(rows)).toBe("b.jpg");
  });

  it("exports min width constant", () => {
    expect(BUILDING_HERO_MIN_WIDTH_PX).toBe(1000);
  });
});
