import { describe, it, expect } from "vitest";
import { buildFindModeFilters } from "./buildFindModeFilters";
import type { MapFilters } from "@/types/plano-map";

const EMPTY: MapFilters = {} as MapFilters;

describe("buildFindModeFilters", () => {
  it("defaults to excluding lost/unbuilt construction statuses (mirrors Browse)", () => {
    const result = buildFindModeFilters(EMPTY);
    // resolveConstructionStatuses applies the same default exclusion the Browse
    // surfaces use, so an otherwise-empty filter set still carries it.
    expect(result?.exclude_construction_statuses).toContain("Unbuilt");
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
