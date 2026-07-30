import { describe, expect, it } from "vitest";
import { DISCOVER_PAGE_SIZE, discoverInViewRpcArgs } from "./discoverInView";

const bounds = { north: 51.6, south: 51.2, east: 0.3, west: -0.5 };

describe("discoverInViewRpcArgs", () => {
  it("maps each compass edge to its own RPC argument", () => {
    // A transposition here would return plausible buildings from the wrong place,
    // which is exactly the kind of bug that survives a visual check.
    const args = discoverInViewRpcArgs(bounds, 1);
    expect(args.min_lat).toBe(bounds.south);
    expect(args.max_lat).toBe(bounds.north);
    expect(args.min_lng).toBe(bounds.west);
    expect(args.max_lng).toBe(bounds.east);
  });

  it("passes the page through and asks for a full page", () => {
    expect(discoverInViewRpcArgs(bounds, 3).page).toBe(3);
    expect(discoverInViewRpcArgs(bounds, 3).page_size).toBe(DISCOVER_PAGE_SIZE);
  });

  it("sends no filters, matching what the discovery pin layer draws", () => {
    expect(discoverInViewRpcArgs(bounds, 1).filter_criteria).toEqual({});
  });
});
