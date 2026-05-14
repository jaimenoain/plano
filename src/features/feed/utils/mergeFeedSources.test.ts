import { describe, it, expect } from "vitest";
import { mergeFeedSources } from "./mergeFeedSources";
import type { FeedItem, FeedItemPost, FeedItemCollection, FeedItemMomentCluster } from "@/types/feedItem";
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

    const result = mergeFeedSources(social, collections, discovery, [], noSeen);

    expect(result[0].id).toBe("social-1");
    expect(result[1].id).toBe("disc-1");
  });

  it("does not deduplicate items (sources are distinct)", () => {
    const social: FeedItem[] = [makePost("a", 1.0, "direct", "alice", "b1")];
    const collections: FeedItem[] = [makeCollection("c1", 0.5)];
    const discovery: FeedItem[] = [makePost("d", 0.8, "open", "bob", "b2")];

    const result = mergeFeedSources(social, collections, discovery, [], noSeen);

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

    const result = mergeFeedSources(social, collections, discovery, [], noSeen);

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
    const result = mergeFeedSources(social, collections, discovery, [], hasSeen);

    expect(result[0].id).toBe("fresh-post");
    expect(result[1].id).toBe("seen-post");
  });

  it("returns empty array when all sources are empty", () => {
    const result = mergeFeedSources([], [], [], [], noSeen);
    expect(result).toHaveLength(0);
  });

  // ── Phase 4: ring-2 (extended) tests ──────────────────────────────────────

  it("extended items appear in output when passed as 4th argument", () => {
    const extended: FeedItem[] = [makePost("ext-1", 0.5, "extended", "carol", "b5")];

    const result = mergeFeedSources([], [], [], extended, noSeen);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ext-1");
    expect(result[0].ring).toBe("extended");
  });

  it("extended items score lower than direct items with equal raw scores (ring multiplier 1.5 < 3.0)", () => {
    // Both have raw score 1.0. After ring multiplier:
    //   direct:   1.0 × 3.0 = 3.0
    //   extended: 1.0 × 1.5 = 1.5
    // Direct post should rank first.
    const social: FeedItem[] = [makePost("direct-1", 1.0, "direct", "alice", "b1")];
    const extended: FeedItem[] = [makePost("ext-1", 1.0, "extended", "carol", "b5")];

    const result = mergeFeedSources(social, [], [], extended, noSeen);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("direct-1");
    expect(result[1].id).toBe("ext-1");
  });

  it("extended items with high raw score can outrank open (discovery) items (1.5 > 1.0)", () => {
    // extended: 1.0 × 1.5 = 1.5  >  open: 1.0 × 1.0 = 1.0
    const discovery: FeedItem[] = [makePost("disc-1", 1.0, "open", "bob", "b2")];
    const extended: FeedItem[] = [makePost("ext-1", 1.0, "extended", "carol", "b5")];

    const result = mergeFeedSources([], [], discovery, extended, noSeen);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ext-1");
    expect(result[1].id).toBe("disc-1");
  });

  it("all four sources are included in the merged output", () => {
    const social: FeedItem[] = [makePost("s1", 1.0, "direct", "alice", "b1")];
    const collections: FeedItem[] = [makeCollection("col-1", 0.5)];
    const discovery: FeedItem[] = [makePost("d1", 0.4, "open", "bob", "b2")];
    const extended: FeedItem[] = [makePost("e1", 0.3, "extended", "carol", "b3")];

    const result = mergeFeedSources(social, collections, discovery, extended, noSeen);

    expect(result).toHaveLength(4);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("col-1");
    expect(ids).toContain("d1");
    expect(ids).toContain("e1");
  });

  // ── Phase 5: building spotlights ──────────────────────────────────────────

  it("spotlight items are included when passed as 5th argument", () => {
    const spotlight: FeedItem = {
      kind: "building_spotlight",
      id: "spotlight:b1",
      ring: "direct",
      score: 2.0,
      attribution: { kind: "direct", text: "5 photos from people you follow" },
      payload: {
        buildingId: "b1",
        buildingName: "Building 1",
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

    const result = mergeFeedSources([], [], [], [], [spotlight], noSeen);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("spotlight:b1");
    expect(result[0].kind).toBe("building_spotlight");
  });

  it("5-arg legacy signature still works (spotlights defaults to [])", () => {
    const social: FeedItem[] = [makePost("s1", 1.0, "direct", "alice", "b1")];
    const result = mergeFeedSources(social, [], [], [], noSeen);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  // ── Phase 6: editorial slots ──────────────────────────────────────────────

  it("editorial items are included when passed as 7th argument", () => {
    const editorial: FeedItem = {
      kind: "editorial",
      subKind: "photo_of_the_day",
      id: "editorial:photo_of_the_day:rev1",
      ring: "editorial",
      score: 10.0,
      attribution: { kind: "editorial", text: "Photo of the Day" },
      payload: {
        buildingId: "b1",
        building: {
          id: "b1",
          name: "Test Building",
          mainImageUrl: null,
          communityPreviewUrl: null,
          city: null,
          slug: null,
          shortId: null,
        },
      },
    };

    const result = mergeFeedSources([], [], [], [], [], noSeen, [editorial]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("editorial:photo_of_the_day:rev1");
    expect(result[0].kind).toBe("editorial");
  });

  it("6-arg signature still works when editorial is omitted", () => {
    const spotlight: FeedItem = {
      kind: "building_spotlight",
      id: "spotlight:b1",
      ring: "direct",
      score: 2.0,
      attribution: { kind: "direct", text: "5 photos from people you follow" },
      payload: {
        buildingId: "b1",
        buildingName: "Building 1",
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
    const result = mergeFeedSources([], [], [], [], [spotlight], noSeen);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("spotlight:b1");
  });

  // ── Phase 7: moment clusters ──────────────────────────────────────────────

  function makeCluster(
    id: string,
    leadPostId: string,
    supportingPostIds: string[],
    score = 2.0,
  ): FeedItemMomentCluster {
    return {
      kind: "moment_cluster",
      id,
      ring: "direct",
      score,
      clusterKind: "multi_user_single_building",
      leadPost: { id: leadPostId, buildingId: "b1", buildingName: "Test Building" },
      supportingPosts: supportingPostIds.map((pid) => ({
        id: pid,
        buildingId: "b1",
        buildingName: "Test Building",
      })),
      actors: [{ id: "u1", username: "alice", avatarUrl: null }],
      buildingOrLocality: {
        kind: "building",
        buildingId: "b1",
        buildingName: "Test Building",
        city: "Lisbon",
        mainImageUrl: null,
        communityPreviewUrl: null,
        slug: null,
        shortId: null,
      },
      attribution: { kind: "direct", text: "alice visited Test Building" },
    };
  }

  it("cluster items are included in the merged output", () => {
    const cluster = makeCluster("cluster-1", "lead-1", [], 5.0);
    const result = mergeFeedSources([], [], [], [], [], noSeen, [], [cluster]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cluster-1");
    expect(result[0].kind).toBe("moment_cluster");
  });

  it("dedup: standalone post whose id is the cluster lead post is removed", () => {
    const post = makePost("lead-1", 3.0, "direct", "alice", "b1");
    const cluster = makeCluster("cluster-1", "lead-1", [], 5.0);

    const result = mergeFeedSources([post], [], [], [], [], noSeen, [], [cluster]);

    const ids = result.map((r) => r.id);
    expect(ids).toContain("cluster-1");
    expect(ids).not.toContain("lead-1");
  });

  it("dedup: standalone posts whose ids are supporting posts are removed", () => {
    const support1 = makePost("s1", 2.0, "direct", "alice", "b1");
    const support2 = makePost("s2", 1.5, "direct", "bob", "b2");
    const unrelated = makePost("u1", 0.5, "direct", "carol", "b3");
    const cluster = makeCluster("cluster-1", "lead", ["s1", "s2"], 8.0);

    const result = mergeFeedSources(
      [support1, support2, unrelated],
      [],
      [],
      [],
      [],
      noSeen,
      [],
      [cluster],
    );

    const ids = result.map((r) => r.id);
    expect(ids).toContain("cluster-1");
    expect(ids).toContain("u1");
    expect(ids).not.toContain("s1");
    expect(ids).not.toContain("s2");
  });

  it("a high-score cluster outranks a low-score standalone post", () => {
    const lowPost = makePost("low", 0.5, "direct", "alice", "b1");
    const cluster = makeCluster("high-cluster", "other-lead", [], 10.0);

    const result = mergeFeedSources([lowPost], [], [], [], [], noSeen, [], [cluster]);

    expect(result[0].id).toBe("high-cluster");
    expect(result[1].id).toBe("low");
  });
});
