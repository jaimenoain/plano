import { describe, it, expect } from "vitest";
import { assembleMosaicItems } from "./assembleMosaicItems";
import type { FeedItemPost, FeedItemCollection, FeedItemPrompt, FeedItemBuildingSpotlight, FeedItemEditorial } from "@/types/feedItem";
import type { FeedReview } from "@/types/feed";

function makePost(
  id: string,
  score: number,
  username: string,
  buildingId: string,
  opts: { images?: { id: string; url: string }[] } = {},
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
      images: opts.images,
      user: { username, avatar_url: null, followers_count: null },
      building: { id: buildingId, name: "Test Building" },
    } as FeedReview,
  };
}

function makeCollection(id: string): FeedItemCollection {
  return {
    kind: "collection",
    id,
    ring: "direct",
    score: 1,
    attribution: { kind: "direct", text: "collection" },
    payload: { id, title: "Test", building_count: 3 } as any,
  };
}

function makePrompt(id: string): FeedItemPrompt {
  return {
    kind: "prompt",
    id,
    ring: "open",
    score: 0,
    attribution: { kind: "open", text: "suggested" },
    payload: { maxSuggestions: 5 },
  };
}

function makeSpotlight(
  id: string,
  buildingId: string,
  score = 3.0,
  ring: FeedItemBuildingSpotlight["ring"] = "direct",
): FeedItemBuildingSpotlight {
  return {
    kind: "building_spotlight",
    id: `spotlight:${id}`,
    ring,
    score,
    attribution: { kind: ring, text: "activity from people you follow" },
    payload: {
      buildingId,
      buildingName: `Building ${id}`,
      buildingCity: "Lisbon",
      mainImageUrl: "https://example.com/img.jpg",
      communityPreviewUrl: null,
      slug: id,
      shortId: null,
      window: "7d",
      postsCount: 3,
      photosCount: 5,
      ring1Contributors: [],
      lastActivityAt: new Date().toISOString(),
    },
  };
}

const withImage = { images: [{ id: "img1", url: "https://example.com/img.jpg" }] };

describe("assembleMosaicItems", () => {
  it("empty input → empty output", () => {
    expect(assembleMosaicItems([])).toEqual([]);
  });

  it("first item always gets its assigned size (anchor = xl if has media)", () => {
    const items = [makePost("a", 2.0, "alice", "b1", withImage)];
    const result = assembleMosaicItems(items);
    expect(result[0].tileSize).toBe("xl");
    expect(result[0].item.id).toBe("a");
  });

  it("first item without media → lg (anchor, text-only)", () => {
    const items = [makePost("a", 2.0, "alice", "b1")];
    const result = assembleMosaicItems(items);
    expect(result[0].tileSize).toBe("lg");
  });

  it("adjacent same-author posts get swapped", () => {
    const items = [
      makePost("a", 10, "alice", "b1", withImage),
      makePost("b", 8, "alice", "b2", withImage), // same author as a
      makePost("c", 6, "carol", "b3", withImage),
    ];
    const result = assembleMosaicItems(items);
    // b and c should be swapped so c comes before b
    expect(result[0].item.id).toBe("a");
    expect(result[1].item.id).toBe("c");
    expect(result[2].item.id).toBe("b");
  });

  it("adjacent same-building posts get swapped", () => {
    const items = [
      makePost("a", 10, "alice", "bldg", withImage),
      makePost("b", 8, "bob", "bldg", withImage), // same building as a
      makePost("c", 6, "carol", "other", withImage),
    ];
    const result = assembleMosaicItems(items);
    expect(result[0].item.id).toBe("a");
    expect(result[1].item.id).toBe("c");
    expect(result[2].item.id).toBe("b");
  });

  it("no conflict means no swap", () => {
    const items = [
      makePost("a", 10, "alice", "b1", withImage),
      makePost("b", 8, "bob", "b2", withImage),
      makePost("c", 6, "carol", "b3", withImage),
    ];
    const result = assembleMosaicItems(items);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b", "c"]);
  });

  it("items with no author/building id do not conflict", () => {
    const items = [
      makeCollection("col1"),
      makeCollection("col2"),
      makePost("p", 5, "alice", "b1"),
    ];
    const result = assembleMosaicItems(items);
    // No conflict among non-post items; order unchanged
    expect(result.map((r) => r.item.id)).toEqual(["col1", "col2", "p"]);
  });

  it("building_spotlight and post sharing the same building conflict and get swapped", () => {
    const spotlight = makeSpotlight("bldg-spotlight", "bldg");
    const post = makePost("post-same-bldg", 8, "alice", "bldg", withImage);
    const other = makePost("other", 6, "bob", "other-bldg", withImage);
    const items = [spotlight, post, other];
    const result = assembleMosaicItems(items);
    // post (same building as spotlight) should be swapped with other
    expect(result[0].item.id).toBe(spotlight.id);
    expect(result[1].item.id).toBe("other");
    expect(result[2].item.id).toBe("post-same-bldg");
  });

  it("spotlight frequency cap: second spotlight within 5 tiles is dropped", () => {
    const s1 = makeSpotlight("s1", "bldg1");
    const s2 = makeSpotlight("s2", "bldg2");
    // Only 2 posts between the two spotlights — not enough gap (need 5)
    const items = [
      s1,
      makePost("p1", 5, "alice", "b1"),
      makePost("p2", 4, "bob", "b2"),
      s2,
    ];
    const result = assembleMosaicItems(items);
    const spotlightIds = result.filter((r) => r.item.kind === "building_spotlight").map((r) => r.item.id);
    expect(spotlightIds).toHaveLength(1);
    expect(spotlightIds[0]).toBe(s1.id);
  });

  it("spotlight frequency cap: second spotlight passes when gap is >= 5", () => {
    const s1 = makeSpotlight("s1", "bldg1");
    const s2 = makeSpotlight("s2", "bldg2");
    const items = [
      s1,
      makePost("p1", 9, "alice", "b1", withImage),
      makePost("p2", 8, "bob", "b2", withImage),
      makePost("p3", 7, "carol", "b3", withImage),
      makePost("p4", 6, "dave", "b4", withImage),
      makePost("p5", 5, "eve", "b5", withImage),
      s2,
    ];
    const result = assembleMosaicItems(items);
    const spotlightIds = result.filter((r) => r.item.kind === "building_spotlight").map((r) => r.item.id);
    expect(spotlightIds).toHaveLength(2);
  });

  it("editorial items are pinned to position 0 regardless of input order", () => {
    const editorial: FeedItemEditorial = {
      kind: "editorial",
      subKind: "photo_of_the_day",
      id: "editorial:photo_of_the_day:rev1",
      ring: "editorial",
      score: 0,
      attribution: { kind: "editorial", text: "Photo of the Day" },
      payload: {
        buildingId: "b-editorial",
        building: {
          id: "b-editorial",
          name: "Award Building",
          mainImageUrl: null,
          communityPreviewUrl: null,
          city: null,
          slug: null,
          shortId: null,
        },
      },
    };
    const post1 = makePost("p1", 10, "alice", "b1", withImage);
    const post2 = makePost("p2", 8, "bob", "b2", withImage);
    // Editorial appears last in the input but should surface first
    const items = [post1, post2, editorial];
    const result = assembleMosaicItems(items);
    expect(result[0].item.kind).toBe("editorial");
    expect(result[0].item.id).toBe(editorial.id);
    expect(result[0].tileSize).toBe("xl");
  });

  it("editorial item participates in building-conflict resolution with posts on the same building", () => {
    const editorial: FeedItemEditorial = {
      kind: "editorial",
      subKind: "trending_this_hour",
      id: "editorial:trending:rev1",
      ring: "editorial",
      score: 5,
      attribution: { kind: "editorial", text: "Trending now" },
      payload: {
        buildingId: "shared-bldg",
        building: {
          id: "shared-bldg",
          name: "Trending Building",
          mainImageUrl: null,
          communityPreviewUrl: null,
          city: null,
          slug: null,
          shortId: null,
        },
      },
    };
    const post = makePost("p-same", 8, "alice", "shared-bldg", withImage);
    const other = makePost("p-other", 6, "bob", "other-bldg", withImage);
    // After pinning: [editorial, p-same, p-other]
    // Adjacent editorial+post share a building → swap post with other
    const result = assembleMosaicItems([editorial, post, other]);
    expect(result[0].item.kind).toBe("editorial");
    expect(result[1].item.id).toBe("p-other");
    expect(result[2].item.id).toBe("p-same");
  });

  it("does not mutate the input array", () => {
    const items = [
      makePost("a", 10, "alice", "bldg"),
      makePost("b", 8, "alice", "bldg"),
      makePost("c", 6, "carol", "other"),
    ];
    const originalOrder = items.map((i) => i.id);
    assembleMosaicItems(items);
    expect(items.map((i) => i.id)).toEqual(originalOrder);
  });
});
