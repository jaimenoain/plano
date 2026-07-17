import { describe, it, expect } from "vitest";
import { buildFindModeFilters } from "./buildFindModeFilters";
import type { MapFilters } from "@/types/plano-map";

const EMPTY: MapFilters = {} as MapFilters;

describe("buildFindModeFilters", () => {
  it("does NOT ship a default construction-status exclusion (name search is authoritative)", () => {
    const result = buildFindModeFilters(EMPTY);
    // Find mode is an explicit typed query, so the default case carries NO
    // exclusion — a building the user names surfaces regardless of status.
    // With no other filters active the whole filter map is empty → undefined.
    expect(result?.exclude_construction_statuses).toBeUndefined();
  });

  it("still maps explicit Building-status picks to inclusion", () => {
    const result = buildFindModeFilters({
      ...EMPTY,
      constructionStatuses: ["Lost"],
    } as MapFilters);
    expect(result?.construction_statuses).toEqual(["Lost"]);
    expect(result?.exclude_construction_statuses).toBeUndefined();
  });

  it("still honors the Show-lost toggle (hides Unbuilt/Under Construction, reveals Lost)", () => {
    const result = buildFindModeFilters({
      ...EMPTY,
      showLost: true,
    } as MapFilters);
    expect(result?.exclude_construction_statuses).toContain("Unbuilt");
    expect(result?.exclude_construction_statuses).not.toContain("Lost");
  });

  it("maps camelCase MapFilters to the snake_case RPC filter shape", () => {
    const result = buildFindModeFilters({
      ...EMPTY,
      category: "cat-1",
      typologies: ["t1", "t2"],
      minSizeSqm: 100,
      awardId: "a1",
    } as MapFilters);

    expect(result).toMatchObject({
      category_id: "cat-1",
      typology_ids: ["t1", "t2"],
      min_size_sqm: 100,
      award_id: "a1",
    });
  });

  it("derives rated_by from contacts when present", () => {
    const result = buildFindModeFilters({
      ...EMPTY,
      contacts: [{ name: "Ada" }, { name: "Mies" }],
    } as MapFilters);

    expect(result?.rated_by).toEqual(["Ada", "Mies"]);
  });
});
