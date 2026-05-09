import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mockRpc },
}));

import { searchPeopleV2 } from "./searchPeopleV2";

const RENZO_ROW = {
  id: "p1",
  name: "Renzo Piano",
  slug: "renzo-piano",
  claim_status: "unclaimed",
  nationality: "Italian",
  avatar_url: null,
  credit_count: 42,
  rank_score: 0.88,
};

beforeEach(() => {
  mockRpc.mockClear();
  mockRpc.mockResolvedValue({ data: [RENZO_ROW], error: null });
});

describe("searchPeopleV2", () => {
  it("calls search_people_v2 rpc with p_query and p_limit", async () => {
    await searchPeopleV2("renzo", { limit: 5 });

    expect(mockRpc).toHaveBeenCalledWith("search_people_v2", {
      p_query: "renzo",
      p_limit: 5,
    });
  });

  it("uses default limit of 10", async () => {
    await searchPeopleV2("renzo");

    expect(mockRpc).toHaveBeenCalledWith("search_people_v2", {
      p_query: "renzo",
      p_limit: 10,
    });
  });

  it("maps rpc row to PersonSummary shape", async () => {
    const results = await searchPeopleV2("renzo");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "p1",
      name: "Renzo Piano",
      slug: "renzo-piano",
      claimStatus: "unclaimed",
      nationality: "Italian",
      avatarUrl: null,
      creditCount: 42,
      associatedCompanies: [],
      knownBuilding: null,
    });
  });

  it("returns empty array when query is blank", async () => {
    const results = await searchPeopleV2("  ");
    expect(results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns empty array when rpc returns no data", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const results = await searchPeopleV2("renz");
    expect(results).toEqual([]);
  });

  it("throws when rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") });
    await expect(searchPeopleV2("renzo")).rejects.toThrow("db error");
  });
});
