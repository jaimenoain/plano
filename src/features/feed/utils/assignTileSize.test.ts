import { describe, it, expect } from "vitest";
import { assignTileSize } from "./assignTileSize";
import type { FeedItem, FeedItemPost, FeedItemCollection, FeedItemPrompt } from "@/types/feedItem";
import type { FeedReview } from "@/types/feed";

function makePost(
  id: string,
  score: number,
  opts: {
    video_url?: string | null;
    images?: { id: string; url: string }[];
  } = {},
): FeedItemPost {
  return {
    kind: "post",
    id,
    ring: "direct",
    score,
    attribution: { kind: "direct", text: `user · just now` },
    payload: {
      id,
      content: "test content",
      rating: 4,
      created_at: new Date().toISOString(),
      is_liked: false,
      likes_count: 0,
      comments_count: 0,
      video_url: opts.video_url ?? null,
      images: opts.images,
      user: { username: "user1", avatar_url: null, followers_count: null },
      building: { id: "bldg1", name: "Test Building" },
    } as FeedReview,
  };
}

function makeCollection(id: string, score: number): FeedItemCollection {
  return {
    kind: "collection",
    id,
    ring: "direct",
    score,
    attribution: { kind: "direct", text: "collection" },
    payload: {
      id,
      title: "Test Collection",
      building_count: 5,
    } as any,
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

describe("assignTileSize", () => {
  it("video post → xl", () => {
    const item = makePost("v1", 2.0, { video_url: "https://example.com/video.mp4" });
    expect(assignTileSize(item)).toBe("xl");
  });

  it("non-video, score > 8.0 with media → xl", () => {
    const item = makePost("p1", 9.0, { images: [{ id: "img1", url: "https://example.com/img.jpg" }] });
    expect(assignTileSize(item)).toBe("xl");
  });

  it("non-video, score > 8.0 without media → NOT xl (sm)", () => {
    const item = makePost("p2", 9.0);
    const size = assignTileSize(item);
    expect(size).not.toBe("xl");
    expect(size).toBe("sm");
  });

  it("text-only anchor → lg (not xl)", () => {
    const item = makePost("p3", 2.0);
    expect(assignTileSize(item, true)).toBe("lg");
  });

  it("media anchor → xl", () => {
    const item = makePost("p4", 2.0, { images: [{ id: "img2", url: "https://example.com/img.jpg" }] });
    expect(assignTileSize(item, true)).toBe("xl");
  });

  it("score > 4.0 with media → lg", () => {
    const item = makePost("p5", 5.0, { images: [{ id: "img3", url: "https://example.com/img.jpg" }] });
    expect(assignTileSize(item)).toBe("lg");
  });

  it("score 2.0 with 1 image → md", () => {
    const item = makePost("p6", 2.0, { images: [{ id: "img4", url: "https://example.com/img.jpg" }] });
    expect(assignTileSize(item)).toBe("md");
  });

  it("no media post → sm", () => {
    const item = makePost("p7", 1.0);
    expect(assignTileSize(item)).toBe("sm");
  });

  it("collection → md", () => {
    const item = makeCollection("c1", 5.0);
    expect(assignTileSize(item)).toBe("md");
  });

  it("prompt → md", () => {
    const item = makePrompt("pr1");
    expect(assignTileSize(item)).toBe("md");
  });
});
