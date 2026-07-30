import { describe, it, expect } from "vitest";
import { deriveMergeBlockers, mapSurvivorRows } from "./mergeState";

const TARGET = "target-id";
const SOURCE = "source-id";
const SURVIVOR = "survivor-id";

describe("deriveMergeBlockers", () => {
  it("returns no blockers when both records are live", () => {
    expect(
      deriveMergeBlockers(
        [
          { id: TARGET, is_deleted: false, merged_into_id: null },
          { id: SOURCE, is_deleted: false, merged_into_id: null },
        ],
        TARGET,
      ),
    ).toEqual([]);
  });

  it("flags an already-merged record and keeps its survivor id", () => {
    expect(
      deriveMergeBlockers(
        [
          { id: TARGET, is_deleted: false, merged_into_id: null },
          { id: SOURCE, is_deleted: true, merged_into_id: SURVIVOR },
        ],
        TARGET,
      ),
    ).toEqual([
      { entityId: SOURCE, role: "source", reason: "merged", survivorId: SURVIVOR },
    ]);
  });

  it("flags a deleted record with no pointer as 'deleted'", () => {
    expect(
      deriveMergeBlockers([{ id: SOURCE, is_deleted: true, merged_into_id: null }], TARGET),
    ).toEqual([
      { entityId: SOURCE, role: "source", reason: "deleted", survivorId: null },
    ]);
  });

  it("labels the record matching targetId as the target — the dangerous case", () => {
    const blockers = deriveMergeBlockers(
      [{ id: TARGET, is_deleted: true, merged_into_id: SURVIVOR }],
      TARGET,
    );
    expect(blockers).toHaveLength(1);
    expect(blockers[0].role).toBe("target");
  });

  it("flags both sides when the pair is circular", () => {
    const blockers = deriveMergeBlockers(
      [
        { id: TARGET, is_deleted: true, merged_into_id: SOURCE },
        { id: SOURCE, is_deleted: true, merged_into_id: TARGET },
      ],
      TARGET,
    );
    expect(blockers.map((b) => b.role)).toEqual(["target", "source"]);
  });

  it("treats a missing is_deleted/merged_into_id as live", () => {
    expect(deriveMergeBlockers([{ id: SOURCE }], TARGET)).toEqual([]);
  });
});

describe("mapSurvivorRows", () => {
  it("keys rows by id and flattens the embedded locality", () => {
    expect(
      mapSurvivorRows([
        {
          id: SURVIVOR,
          slug: "farnsworth-house-3745",
          short_id: 3745,
          locality: { country_code: "US", city_slug: "plano" },
        },
      ]),
    ).toEqual({
      [SURVIVOR]: {
        id: SURVIVOR,
        slug: "farnsworth-house-3745",
        short_id: 3745,
        locality_country_code: "US",
        locality_city_slug: "plano",
      },
    });
  });

  it("nulls the locality fields when there is no locality", () => {
    const mapped = mapSurvivorRows([{ id: SURVIVOR, slug: null, short_id: 3745, locality: null }]);
    expect(mapped[SURVIVOR].locality_country_code).toBeNull();
    expect(mapped[SURVIVOR].locality_city_slug).toBeNull();
  });

  it("returns an empty map for null or empty input", () => {
    expect(mapSurvivorRows(null)).toEqual({});
    expect(mapSurvivorRows([])).toEqual({});
  });
});
