import { describe, it, expect } from "vitest";
import { assembleMosaicItems } from "./assembleMosaicItems";
import type { FeedItemPost, FeedItemCollection, FeedItemPrompt } from "@/types/feedItem";
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
