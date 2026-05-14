import { describe, it, expect } from "vitest";
import { getEditorialSlots } from "./getEditorialSlots";
import { vi } from "vitest";

// getEditorialSlots calls supabase.rpc — we test its mapping logic by mocking
// the supabase module. Integration tests against a live DB are out of scope here.

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

function rpcReturning(data: unknown) {
  return Promise.resolve({ data, error: null });
}

function rpcError() {
  return Promise.resolve({ data: null, error: { message: "DB error" } });
}

const RAW_BUILDING = {
  id: "b1",
  name: "Test Building",
  main_image_url: "https://example.com/img.jpg",
  community_preview_url: null,
  city: "Porto",
  slug: "test-building",
  short_id: 42,
};

const RAW_AUTHOR = { username: "alice", avatar_url: "https://example.com/avatar.jpg" };

describe("getEditorialSlots", () => {
  it("returns photo_of_the_day slot when RPC returns data", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_photo_of_the_day") {
        return rpcReturning([
          {
            image_storage_path: "reviews/img1.jpg",
            review_id: "rev-1",
            building_id: "b1",
            building_data: RAW_BUILDING,
            author_data: RAW_AUTHOR,
            score: 42.0,
          },
        ]);
      }
      return rpcReturning([]);
    });

    const slots = await getEditorialSlots();

    const potd = slots.find((s) => s.subKind === "photo_of_the_day");
    expect(potd).toBeDefined();
    expect(potd?.id).toBe("editorial:photo_of_the_day:rev-1");
    expect(potd?.ring).toBe("editorial");
    expect(potd?.payload.buildingId).toBe("b1");
    expect(potd?.payload.building.name).toBe("Test Building");
    expect(potd?.payload.building.mainImageUrl).toBe("https://example.com/img.jpg");
    expect(potd?.payload.imageStoragePath).toBe("reviews/img1.jpg");
    expect(potd?.payload.author?.username).toBe("alice");
    expect(potd?.attribution.text).toBe("Photo of the Day");
  });

  it("returns on_this_day slot with correct attribution text", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_on_this_day") {
        return rpcReturning([
          {
            building_id: "b1",
            building_data: RAW_BUILDING,
            years_ago: 5,
            visit_date: "2021-05-14",
            visit_rating: 4,
          },
        ]);
      }
      return rpcReturning([]);
    });

    const slots = await getEditorialSlots();
    const otd = slots.find((s) => s.subKind === "on_this_day");
    expect(otd).toBeDefined();
    expect(otd?.attribution.text).toBe("5 years ago today");
    expect(otd?.payload.yearsAgo).toBe(5);
    expect(otd?.payload.visitRating).toBe(4);
  });

  it("uses singular 'year' for on_this_day when yearsAgo === 1", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_on_this_day") {
        return rpcReturning([
          {
            building_id: "b2",
            building_data: { ...RAW_BUILDING, id: "b2" },
            years_ago: 1,
            visit_date: "2025-05-14",
            visit_rating: 5,
          },
        ]);
      }
      return rpcReturning([]);
    });

    const slots = await getEditorialSlots();
    const otd = slots.find((s) => s.subKind === "on_this_day");
    expect(otd?.attribution.text).toBe("1 year ago today");
  });

  it("returns trending_this_hour slot with velocity data", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_trending_this_hour") {
        return rpcReturning([
          {
            review_id: "rev-trend",
            building_id: "b1",
            building_data: RAW_BUILDING,
            author_data: RAW_AUTHOR,
            image_storage_path: "reviews/trend.jpg",
            engagement_velocity: 12.5,
            recent_likes: 23,
          },
        ]);
      }
      return rpcReturning([]);
    });

    const slots = await getEditorialSlots();
    const trending = slots.find((s) => s.subKind === "trending_this_hour");
    expect(trending).toBeDefined();
    expect(trending?.id).toBe("editorial:trending:rev-trend");
    expect(trending?.payload.engagementVelocity).toBe(12.5);
    expect(trending?.payload.recentLikes).toBe(23);
    expect(trending?.attribution.text).toBe("Trending now");
  });

  it("returns empty array when all RPCs return no rows", async () => {
    mockRpc.mockImplementation(() => rpcReturning([]));
    const slots = await getEditorialSlots();
    expect(slots).toHaveLength(0);
  });

  it("omits a slot when its RPC throws but still returns the others", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_photo_of_the_day") return rpcError();
      if (name === "get_on_this_day") {
        return rpcReturning([
          {
            building_id: "b1",
            building_data: RAW_BUILDING,
            years_ago: 3,
            visit_date: "2023-05-14",
            visit_rating: 4,
          },
        ]);
      }
      return rpcReturning([]);
    });

    // photo_of_the_day RPC errors → its fetch rejects → allSettled catches it
    const slots = await getEditorialSlots();
    expect(slots.find((s) => s.subKind === "photo_of_the_day")).toBeUndefined();
    expect(slots.find((s) => s.subKind === "on_this_day")).toBeDefined();
  });
});
