import { describe, it, expect } from "vitest";
import { mergeFeedSources } from "./mergeFeedSources";
import type { FeedItem, FeedItemPost, FeedItemCollection } from "@/types/feedItem";
import type { FeedReview, FeedCollection } from "@/types/feed";

function makePost(
  id: string,
  score: number,
  ring: FeedItemPost["ring"] = "direct",
  username = "alice",
  buildingId = "b1",
): FeedItemPost {
  return {
    kind: "post",
    id,
    ring,
    score,
    attribution: { kind: ring, text: `${username} · just now` },
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

function makeCollection(
  id: string,
  score: number,
  ring: FeedItemCollection["ring"] = "direct",
): FeedItemCollection {
  return {
    kind: "collection",
    id,
    ring,
    score,
    attribution: { kind: ring, text: `Collection · updated just now` },
    payload: {
      id,
      name: `Collection ${id}`,
      slug: id,
      description: null,
      updatedAt: new Date().toISOString(),
      ownerId: "owner-1",
      primaryTag: null,
      owner: { id: "owner-1", username: "alice", avatarUrl: null },
      previewBuildings: [],
      buildingCount: 0,
    } as FeedCollection,
  };
}

const noSeen = (_id: string) => false;

describe("mergeFeedSources", () => {
  it("direct items appear before open items when scores are otherwise equal", () => {
    // direct ring multiplier = 3.0, open = 1.0
    // direct score 1.0 × 3.0 = 3.0 > open score 2.0 × 1.0 = 2.0
    const social: FeedItem[] = [makePost("social-1", 1.0, "direct", "alice", "b1")];
    const collections: FeedItem[] = [];
    const discovery: FeedItem[] = [makePost("disc-1", 2.0, "open", "bob", "b2")];

    const result = mergeFeedSources(social, collections, discovery, noSeen);

    expect(result[0].id).toBe("social-1");
    expect(result[1].id).toBe("disc-1");
  });

  it("does not deduplicate items (sources are distinct)", () => {
    const social: FeedItem[] = [makePost("a", 1.0, "direct", "alice", "b1")];
    const collections: FeedItem[] = [makeCollection("c1", 0.5)];
    const discovery: FeedItem[] = [makePost("d", 0.8, "open", "bob", "b2")];

    const result = mergeFeedSources(social, collections, discovery, noSeen);

    expect(result).toHaveLength(3);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("a");
    expect(ids).toContain("c1");
    expect(ids).toContain("d");
  });

  it("returns collections + discovery properly scored when social is empty", () => {
    const social: FeedItem[] = [];
    const collections: FeedItem[] = [makeCollection("col-1", 0.9), makeCollection("col-2", 0.7)];
    const discovery: FeedItem[] = [makePost("disc-1", 0.5, "open", "bob", "b3")];

    const result = mergeFeedSources(social, collections, discovery, noSeen);

    expect(result).toHaveLength(3);
    // collections are ring='direct' (multiplier 3.0); disc is ring='open' (multiplier 1.0)
    // col-1 score: 0.9 × 3.0 = 2.7 → first
    // col-2 score: 0.7 × 3.0 = 2.1 → second
    // disc-1 score: 0.5 × 1.0 = 0.5 → third
    expect(result[0].id).toBe("col-1");
    expect(result[1].id).toBe("col-2");
    expect(result[2].id).toBe("disc-1");
  });

  it("seen penalty: a seen item is penalized below equivalent unseen items", () => {
    const social: FeedItem[] = [
      makePost("seen-post", 1.0, "direct", "alice", "b1"),
      makePost("fresh-post", 0.5, "direct", "bob", "b2"),
    ];
    const collections: FeedItem[] = [];
    const discovery: FeedItem[] = [];

    // "seen-post" has score 1.0 × ring(3.0) = 3.0, but seen ×0.3 = 0.9
    // "fresh-post" has score 0.5 × ring(3.0) = 1.5 → beats seen-post
    const hasSeen = (id: string) => id === "seen-post";
    const result = mergeFeedSources(social, collections, discovery, hasSeen);

    expect(result[0].id).toBe("fresh-post");
    expect(result[1].id).toBe("seen-post");
  });

  it("returns empty array when all sources are empty", () => {
    const result = mergeFeedSources([], [], [], noSeen);
    expect(result).toHaveLength(0);
  });
});
