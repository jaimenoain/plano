import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mockRpc },
}));

import { searchBuildingsV2 } from "./searchBuildingsV2";

const SHARD_HIT = {
  id: "b1",
  name: "The Shard",
  slug: "the-shard",
  alt_name: null,
  hero_image_url: "https://cdn.example.com/shard.jpg",
  lat: 51.5045,
  lng: -0.0865,
  city: "London",
  country: "United Kingdom",
  year_completed: 2012,
  popularity_score: 850,
  tier_rank: "Top 1%",
  credit_names: ["Renzo Piano"],
  rank_score: 0.92,
};

beforeEach(() => {
  mockRpc.mockClear();
  mockRpc.mockResolvedValue({ data: [SHARD_HIT], error: null });
});

describe("searchBuildingsV2", () => {
  it("calls rpc with p_query, p_limit, p_offset, p_filters", async () => {
    await searchBuildingsV2("shard", { limit: 10, offset: 5, filters: { country: "United Kingdom" } });

    expect(mockRpc).toHaveBeenCalledWith("search_buildings_v2", {
      p_query: "shard",
      p_limit: 10,
      p_offset: 5,
      p_filters: { country: "United Kingdom" },
    });
  });

  it("uses sensible defaults when opts are omitted", async () => {
    await searchBuildingsV2("renzo piano");

    expect(mockRpc).toHaveBeenCalledWith("search_buildings_v2", {
      p_query: "renzo piano",
      p_limit: 20,
      p_offset: 0,
      p_filters: {},
    });
  });

  it("returns typed BuildingSearchHit array", async () => {
    const results = await searchBuildingsV2("shard");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("b1");
    expect(results[0].name).toBe("The Shard");
    expect(results[0].rank_score).toBe(0.92);
    expect(results[0].credit_names).toContain("Renzo Piano");
  });

  it("passes through coordinate-less hits untouched (null lat/lng)", async () => {
    // The migration drops the `location IS NOT NULL` gate so a name search can
    // return a building with no coordinates; lat/lng come back NULL. The client
    // contract must carry them through unchanged (no pin, still listed).
    const NO_COORDS_HIT = {
      ...SHARD_HIT,
      id: "farnsworth",
      name: "Farnsworth House",
      slug: "farnsworth-house",
      lat: null,
      lng: null,
    };
    mockRpc.mockResolvedValue({ data: [NO_COORDS_HIT], error: null });

    const results = await searchBuildingsV2("farnsworth house");

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Farnsworth House");
    expect(results[0].lat).toBeNull();
    expect(results[0].lng).toBeNull();
  });

  it("returns empty array when rpc returns null data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const results = await searchBuildingsV2("nothing");
    expect(results).toEqual([]);
  });

  it("throws when rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });
    await expect(searchBuildingsV2("fail")).rejects.toMatchObject({ message: "RPC failed" });
  });

  it("passes empty filters object when none provided", async () => {
    await searchBuildingsV2("bilbao");
    const call = mockRpc.mock.calls[0];
    expect(call[1].p_filters).toEqual({});
  });
});
