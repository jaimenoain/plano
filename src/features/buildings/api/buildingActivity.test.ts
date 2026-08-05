import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBuildingActivity } from "./buildingActivity";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({
          data: { publicUrl: `https://cdn.test/avatars/${p}` },
        }),
      }),
    },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("fetchBuildingActivity", () => {
  it("reads through get_building_activity and resolves bare avatar paths", async () => {
    rpcMock.mockResolvedValue({
      data: {
        visited: [
          { user_id: "u1", username: "anna", avatar_url: "u1/pic.jpg", rating: 3 },
          { user_id: "u2", username: "marco", avatar_url: "https://x.test/m.png", rating: null },
        ],
        saved: [{ user_id: "u3", username: "lin", avatar_url: null, rating: null }],
        total_visited: 2,
        total_saved: 7,
      },
      error: null,
    });

    const result = await fetchBuildingActivity("b1", 12);

    expect(rpcMock).toHaveBeenCalledWith("get_building_activity", {
      p_building_id: "b1",
      p_limit: 12,
    });
    // Bare storage paths become full URLs; URLs already stored as such pass through.
    expect(result.visited[0].avatar_url).toBe("https://cdn.test/avatars/u1/pic.jpg");
    expect(result.visited[1].avatar_url).toBe("https://x.test/m.png");
    expect(result.saved[0].avatar_url).toBeNull();
    // Totals are unclamped — they can exceed the returned arrays.
    expect(result.totalSaved).toBe(7);
  });

  it("returns empty groups when the building has no activity", async () => {
    rpcMock.mockResolvedValue({
      data: { visited: [], saved: [], total_visited: 0, total_saved: 0 },
      error: null,
    });

    const result = await fetchBuildingActivity("b1");

    expect(result.visited).toEqual([]);
    expect(result.saved).toEqual([]);
    expect(result.totalVisited).toBe(0);
  });

  it("throws when the RPC errors so the query can surface it", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "denied" } });

    await expect(fetchBuildingActivity("b1")).rejects.toBeTruthy();
  });
});
