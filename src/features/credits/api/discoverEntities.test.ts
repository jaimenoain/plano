/**
 * discoverPeople / discoverCompanies tests
 *
 * These browse-mode helpers back the /search People & Companies tabs. They call
 * the bbox-ranked discover_people / discover_companies RPCs and map snake_case
 * rows to the PersonSummary / CompanySummary shapes the sidebar renders.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mockRpc },
}));

import { discoverPeople } from "./people";
import { discoverCompanies } from "./companies";

const BOUNDS = { south: 51.4, north: 51.6, west: -0.2, east: 0.1 };

const PERSON_ROW = {
  id: "p1",
  name: "Renzo Piano",
  slug: "renzo-piano",
  claim_status: "unclaimed",
  nationality: "Italian",
  avatar_url: null,
  credit_count: 7,
};

const COMPANY_ROW = {
  id: "c1",
  name: "OMA",
  slug: "oma",
  claim_status: "unclaimed",
  country: "Netherlands",
  logo_url: null,
  credit_count: 4,
};

beforeEach(() => {
  mockRpc.mockReset();
});

describe("discoverPeople", () => {
  it("calls discover_people with the bbox mapped to min/max lat/lng and a limit", async () => {
    mockRpc.mockResolvedValue({ data: [PERSON_ROW], error: null });
    await discoverPeople(BOUNDS, 30);

    expect(mockRpc).toHaveBeenCalledWith("discover_people", {
      min_lat: BOUNDS.south,
      max_lat: BOUNDS.north,
      min_lng: BOUNDS.west,
      max_lng: BOUNDS.east,
      p_limit: 30,
    });
  });

  it("maps rpc rows to the PersonSummary shape", async () => {
    mockRpc.mockResolvedValue({ data: [PERSON_ROW], error: null });
    const results = await discoverPeople(BOUNDS);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "p1",
      name: "Renzo Piano",
      slug: "renzo-piano",
      claimStatus: "unclaimed",
      nationality: "Italian",
      avatarUrl: null,
      creditCount: 7,
      associatedCompanies: [],
      knownBuilding: null,
    });
  });

  it("returns [] without calling the rpc when there are no bounds", async () => {
    const results = await discoverPeople(null);
    expect(results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws when the rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") });
    await expect(discoverPeople(BOUNDS)).rejects.toThrow("db error");
  });
});

describe("discoverCompanies", () => {
  it("calls discover_companies with the bbox mapped to min/max lat/lng and a limit", async () => {
    mockRpc.mockResolvedValue({ data: [COMPANY_ROW], error: null });
    await discoverCompanies(BOUNDS, 30);

    expect(mockRpc).toHaveBeenCalledWith("discover_companies", {
      min_lat: BOUNDS.south,
      max_lat: BOUNDS.north,
      min_lng: BOUNDS.west,
      max_lng: BOUNDS.east,
      p_limit: 30,
    });
  });

  it("maps rpc rows to the CompanySummary shape", async () => {
    mockRpc.mockResolvedValue({ data: [COMPANY_ROW], error: null });
    const results = await discoverCompanies(BOUNDS);

    expect(results[0]).toMatchObject({
      id: "c1",
      name: "OMA",
      slug: "oma",
      claimStatus: "unclaimed",
      country: "Netherlands",
      logoUrl: null,
      creditCount: 4,
    });
  });

  it("returns [] without calling the rpc when there are no bounds", async () => {
    const results = await discoverCompanies(null);
    expect(results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
