import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mockRpc },
}));

import { searchCompaniesV2 } from "./searchCompaniesV2";

const OMA_ROW = {
  id: "c1",
  name: "OMA",
  slug: "oma",
  claim_status: "unclaimed",
  country: "Netherlands",
  logo_url: null,
  credit_count: 35,
  rank_score: 0.81,
};

beforeEach(() => {
  mockRpc.mockClear();
  mockRpc.mockResolvedValue({ data: [OMA_ROW], error: null });
});

describe("searchCompaniesV2", () => {
  it("calls search_companies_v2 rpc with p_query and p_limit", async () => {
    await searchCompaniesV2("oma", { limit: 5 });

    expect(mockRpc).toHaveBeenCalledWith("search_companies_v2", {
      p_query: "oma",
      p_limit: 5,
    });
  });

  it("uses default limit of 10", async () => {
    await searchCompaniesV2("oma");

    expect(mockRpc).toHaveBeenCalledWith("search_companies_v2", {
      p_query: "oma",
      p_limit: 10,
    });
  });

  it("maps rpc row to CompanySummary shape", async () => {
    const results = await searchCompaniesV2("oma");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "c1",
      name: "OMA",
      slug: "oma",
      claimStatus: "unclaimed",
      country: "Netherlands",
      logoUrl: null,
      creditCount: 35,
    });
  });

  it("returns empty array when query is blank", async () => {
    const results = await searchCompaniesV2("  ");
    expect(results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws when rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") });
    await expect(searchCompaniesV2("oma")).rejects.toThrow("db error");
  });
});
