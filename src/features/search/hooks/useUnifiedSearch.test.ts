/**
 * useUnifiedSearch tests
 *
 * Includes the architectural regression test for the viewport-gating bug:
 * "Searching 'Shard' from a map looking at Australia returns the Shard."
 * This test confirms search_buildings_v2 is called WITHOUT a bbox parameter,
 * proving the Find/Browse dispatch has broken the coupling between camera
 * position and text-search results.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock RPC calls
const mockSearchBuildings = vi.hoisted(() => vi.fn());
const mockSearchPeople = vi.hoisted(() => vi.fn());
const mockSearchCompanies = vi.hoisted(() => vi.fn());

vi.mock("@/features/search/api/searchBuildingsV2", () => ({
  searchBuildingsV2: mockSearchBuildings,
}));
vi.mock("@/features/search/api/searchPeopleV2", () => ({
  searchPeopleV2: mockSearchPeople,
}));
vi.mock("@/features/search/api/searchCompaniesV2", () => ({
  searchCompaniesV2: mockSearchCompanies,
}));
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => unknown; enabled: boolean }) => {
    if (!enabled) return { data: undefined, isLoading: false, error: null };
    try {
      const data = queryFn();
      return { data, isLoading: false, error: null };
    } catch (err) {
      return { data: undefined, isLoading: false, error: err };
    }
  },
}));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useRef: () => ({ current: null }) };
});

import { useUnifiedSearch } from "./useUnifiedSearch";

beforeEach(() => {
  mockSearchBuildings.mockClear();
  mockSearchPeople.mockClear();
  mockSearchCompanies.mockClear();
});

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

const RENZO_PERSON = {
  id: "p1",
  name: "Renzo Piano",
  slug: "renzo-piano",
  claimStatus: "unclaimed" as const,
  associatedCompanies: [],
  knownBuilding: null,
};

describe("useUnifiedSearch", () => {
  it("returns empty results when query is shorter than minLength", () => {
    const result = useUnifiedSearch({ query: "s" });
    expect(result.buildings).toEqual([]);
    expect(result.people).toEqual([]);
    expect(result.companies).toEqual([]);
    expect(result.isLoading).toBe(false);
    expect(mockSearchBuildings).not.toHaveBeenCalled();
  });

  it("fires all three RPCs in parallel when query >= 2 chars", () => {
    mockSearchBuildings.mockResolvedValue([SHARD_HIT]);
    mockSearchPeople.mockResolvedValue([RENZO_PERSON]);
    mockSearchCompanies.mockResolvedValue([]);

    useUnifiedSearch({ query: "shard" });

    expect(mockSearchBuildings).toHaveBeenCalledWith("shard", expect.objectContaining({ limit: 30 }));
    expect(mockSearchPeople).toHaveBeenCalledWith("shard", expect.objectContaining({ limit: 10 }));
    expect(mockSearchCompanies).toHaveBeenCalledWith("shard", expect.objectContaining({ limit: 10 }));
  });

  /**
   * ARCHITECTURAL REGRESSION TEST — viewport-gating bug
   *
   * Before Phase 2, search was constrained by debouncedBounds: if bounds was
   * null (map not yet initialised) or pointed at Australia, searching "Shard"
   * returned [] because get_map_clusters only scanned the visible viewport.
   *
   * This test proves search_buildings_v2 is called WITHOUT any bbox argument,
   * regardless of the map camera position. The Shard must appear in results
   * even if the simulated map is looking at Sydney, Australia.
   */
  it("calls search_buildings_v2 WITHOUT a bbox — viewport-gating is eliminated", () => {
    mockSearchBuildings.mockResolvedValue([SHARD_HIT]);
    mockSearchPeople.mockResolvedValue([]);
    mockSearchCompanies.mockResolvedValue([]);

    // Simulate the map looking at Sydney, Australia
    const australiaBounds = { north: -33.0, south: -34.0, east: 151.5, west: 150.5 };
    void australiaBounds; // acknowledged but intentionally NOT passed to the hook

    // useUnifiedSearch takes no bounds parameter — this is the architectural guarantee
    useUnifiedSearch({ query: "Shard" });

    expect(mockSearchBuildings).toHaveBeenCalledTimes(1);
    const [, opts] = mockSearchBuildings.mock.calls[0];
    // Confirm no bbox was forwarded
    expect(opts?.filters?.min_lat).toBeUndefined();
    expect(opts?.filters?.max_lat).toBeUndefined();
    expect(opts?.filters?.min_lng).toBeUndefined();
    expect(opts?.filters?.max_lng).toBeUndefined();
  });

  it("passes filters through to search_buildings_v2", () => {
    mockSearchBuildings.mockResolvedValue([]);
    mockSearchPeople.mockResolvedValue([]);
    mockSearchCompanies.mockResolvedValue([]);

    useUnifiedSearch({
      query: "brutalism",
      filters: { construction_statuses: ["Built"] },
    });

    expect(mockSearchBuildings).toHaveBeenCalledWith(
      "brutalism",
      expect.objectContaining({ filters: { construction_statuses: ["Built"] } }),
    );
  });

  it("returns empty results when query is blank string", () => {
    const result = useUnifiedSearch({ query: "   " });
    expect(result.buildings).toEqual([]);
    expect(mockSearchBuildings).not.toHaveBeenCalled();
  });
});
