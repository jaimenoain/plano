import { describe, it, expect } from "vitest";
import { scoreFeedItem } from "./scoreFeedItem";
import type { FeedItem, FeedItemPost, FeedItemBuildingSpotlight } from "@/types/feedItem";
import type { FeedReview } from "@/types/feed";

function makePost(
  id: string,
  score: number,
  username: string,
  buildingId: string,
): FeedItemPost {
  return {
    kind: "post",
    id,
    ring: "direct",
    score,
    attribution: { kind: "direct", text: `${username} · just now` },
    payload: {
      id,
      content: "test",
      rating: 4,
      created_at: new Date().toISOString(),
      is_liked: false,
      likes_count: 0,
      comments_count: 0,
      user: { username, avatar_url: null, followers_count: null },
      building: { id: buildingId, name: "Test Building" },
    } as FeedReview,
  };
}

const noSeen = (_id: string) => false;

describe("scoreFeedItem", () => {
  it("preserves order when all items are unique authors and buildings", () => {
    const items: FeedItem[] = [
      makePost("a", 10, "alice", "b1"),
      makePost("b", 8, "bob", "b2"),
      makePost("c", 6, "carol", "b3"),
    ];
    const result = scoreFeedItem(items, noSeen);
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("applies author diversity penalty: second item by same author drops", () => {
    const items: FeedItem[] = [
      makePost("a1", 10, "alice", "b1"),
      makePost("a2", 9, "alice", "b2"), // same author → score × 0.6 = 5.4
      makePost("b1", 6, "bob", "b3"),
    ];
    const result = scoreFeedItem(items, noSeen);
    // a1=10, b1=6, a2=5.4 → order: a1, b1, a2
    expect(result[0].id).toBe("a1");
    expect(result[1].id).toBe("b1");
    expect(result[2].id).toBe("a2");
  });

  it("applies building diversity penalty: second item for same building drops", () => {
    const items: FeedItem[] = [
      makePost("x1", 10, "alice", "bldg"),
      makePost("x2", 9, "bob", "bldg"), // same building → score × 0.6 = 5.4
      makePost("x3", 6, "carol", "other"),
    ];
    const result = scoreFeedItem(items, noSeen);
    expect(result[0].id).toBe("x1");
    expect(result[1].id).toBe("x3");
    expect(result[2].id).toBe("x2");
  });

  it("applies seen penalty: seen items score × 0.3", () => {
    const items: FeedItem[] = [
      makePost("seen", 10, "alice", "b1"),
      makePost("fresh", 4, "bob", "b2"),
    ];
    const hasSeen = (id: string) => id === "seen";
    const result = scoreFeedItem(items, hasSeen);
    // seen = 10 × 0.3 = 3; fresh = 4 → order: fresh, seen
    expect(result[0].id).toBe("fresh");
    expect(result[1].id).toBe("seen");
  });

  it("updates adjusted score on returned items (includes ring multiplier)", () => {
    // ring='direct' → multiplier 3.0
    // a: 10 × 3.0 × 1.0 (no author/building penalty) = 30
    // b: 9 × 3.0 × 0.6 (same author, second item) = 16.2
    const items: FeedItem[] = [
      makePost("a", 10, "alice", "b1"),
      makePost("b", 9, "alice", "b2"),
    ];
    const result = scoreFeedItem(items, noSeen);
    const aItem = result.find((r) => r.id === "a")!;
    const bItem = result.find((r) => r.id === "b")!;
    expect(aItem.score).toBeCloseTo(10 * 3.0);
    expect(bItem.score).toBeCloseTo(9 * 3.0 * 0.6);
  });

  it("architectural regression: video post 6h old outranks text-only 5min old by same author", () => {
    // This mirrors the scoring formula in the RPC — here we test the client-side
    // diversity layer doesn't accidentally re-invert a correct ranking.
    // Simulate: RPC already scored video post higher; scoreFeedItem must preserve that.
    const items: FeedItem[] = [
      makePost("video", 2.8, "alice", "b1"), // higher RPC score (video boost)
      makePost("text", 0.65, "alice", "b2"), // lower RPC score (text-only, 5min)
    ];
    const result = scoreFeedItem(items, noSeen);
    // video=2.8, text=0.65×0.6=0.39 → video still first
    expect(result[0].id).toBe("video");
  });

  it("building_spotlight shares building diversity pool with posts for the same building", () => {
    const spotlight: FeedItemBuildingSpotlight = {
      kind: "building_spotlight",
      id: "spotlight:bldg",
      ring: "direct",
      score: 10,
      attribution: { kind: "direct", text: "5 photos from people you follow" },
      payload: {
        buildingId: "bldg",
        buildingName: "Test Building",
        buildingCity: "Lisbon",
        mainImageUrl: null,
        communityPreviewUrl: null,
        slug: null,
        shortId: null,
        window: "7d",
        postsCount: 3,
        photosCount: 5,
        ring1Contributors: [],
        lastActivityAt: new Date().toISOString(),
      },
    };
    const postSameBuilding = makePost("p-same", 9, "alice", "bldg");
    const postOther = makePost("p-other", 6, "bob", "other-bldg");
    // Spotlight appears first (score 10), post for same building penalized
    const result = scoreFeedItem([spotlight, postSameBuilding, postOther], noSeen);
    expect(result[0].id).toBe("spotlight:bldg");
    // postSameBuilding gets building penalty (0.6) → 9×3×0.6=16.2; postOther→6×3=18 → postOther second
    expect(result[1].id).toBe("p-other");
    expect(result[2].id).toBe("p-same");
  });

  it("does not mutate input items", () => {
    const original: FeedItem[] = [makePost("a", 10, "alice", "b1")];
    const originalScore = original[0].score;
    scoreFeedItem(original, noSeen);
    expect(original[0].score).toBe(originalScore);
  });
});
