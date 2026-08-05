import { describe, it, expect, beforeEach, vi } from "vitest";
import { hideBuildingFromCollection } from "./collectionItems";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

/**
 * One chainable builder per call. `update(...).eq().eq().select()` resolves to
 * whatever the test queued as the flipped rows; `insert(...)` resolves empty.
 */
function makeBuilder(flipped: { id: string }[]) {
  const calls: { update?: unknown; insert?: unknown } = {};
  const builder: Record<string, unknown> = {
    update: vi.fn((v: unknown) => {
      calls.update = v;
      return builder;
    }),
    insert: vi.fn((v: unknown) => {
      calls.insert = v;
      return Promise.resolve({ data: null, error: null });
    }),
    eq: vi.fn(() => builder),
    select: vi.fn(() => Promise.resolve({ data: flipped, error: null })),
  };
  return { builder, calls };
}

describe("hideBuildingFromCollection", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("flips the existing row instead of adding a second one", async () => {
    const { builder, calls } = makeBuilder([{ id: "item-1" }]);
    mockFrom.mockReturnValue(builder);

    await hideBuildingFromCollection("col-1", "b-1");

    expect(calls.update).toEqual({ is_hidden: true });
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("writes a tombstone when the collection does not hold the building", async () => {
    const { builder, calls } = makeBuilder([]);
    mockFrom.mockReturnValue(builder);

    await hideBuildingFromCollection("col-1", "b-2");

    expect(calls.insert).toEqual({
      collection_id: "col-1",
      building_id: "b-2",
      is_hidden: true,
    });
  });
});
