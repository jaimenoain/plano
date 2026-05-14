import { describe, it, expect } from "vitest";
import { assignTileSize } from "./assignTileSize";
import type { FeedItem, FeedItemPost, FeedItemCollection, FeedItemPrompt, FeedItemBuildingSpotlight, FeedItemEditorial } from "@/types/feedItem";
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

  it("building_spotlight ring='direct' score > 8 → xl", () => {
    const item: FeedItemBuildingSpotlight = {
      kind: "building_spotlight",
      id: "spotlight:b1",
      ring: "direct",
      score: 9.0,
      attribution: { kind: "direct", text: "5 photos from people you follow" },
      payload: {
        buildingId: "b1",
        buildingName: "Casa da Música",
        buildingCity: "Porto",
        mainImageUrl: "https://example.com/img.jpg",
        communityPreviewUrl: null,
        slug: "casa-da-musica",
        shortId: 42,
        window: "7d",
        postsCount: 5,
        photosCount: 14,
        ring1Contributors: [],
        lastActivityAt: new Date().toISOString(),
      },
    };
    expect(assignTileSize(item)).toBe("xl");
  });

  it("building_spotlight ring='direct' score <= 8 → lg", () => {
    const item: FeedItemBuildingSpotlight = {
      kind: "building_spotlight",
      id: "spotlight:b2",
      ring: "direct",
      score: 5.0,
      attribution: { kind: "direct", text: "3 photos from people you follow" },
      payload: {
        buildingId: "b2",
        buildingName: "Test Building",
        buildingCity: "Lisbon",
        mainImageUrl: null,
        communityPreviewUrl: null,
        slug: null,
        shortId: null,
        window: "30d",
        postsCount: 2,
        photosCount: 3,
        ring1Contributors: [],
        lastActivityAt: new Date().toISOString(),
      },
    };
    expect(assignTileSize(item)).toBe("lg");
  });

  it("editorial → always xl regardless of score or subKind", () => {
    const item: FeedItemEditorial = {
      kind: "editorial",
      subKind: "photo_of_the_day",
      id: "editorial:photo_of_the_day:rev1",
      ring: "editorial",
      score: 0,
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
        reviewId: "rev1",
        imageStoragePath: null,
      },
    };
    expect(assignTileSize(item)).toBe("xl");
    expect(assignTileSize(item, false)).toBe("xl");
  });

  it("building_spotlight ring='open' always → lg (no xl for open spotlights)", () => {
    const item: FeedItemBuildingSpotlight = {
      kind: "building_spotlight",
      id: "spotlight:b3",
      ring: "open",
      score: 12.0, // high score but open ring
      attribution: { kind: "open", text: "Trending in Berlin today" },
      payload: {
        buildingId: "b3",
        buildingName: "Open Building",
        buildingCity: "Berlin",
        mainImageUrl: null,
        communityPreviewUrl: null,
        slug: null,
        shortId: null,
        window: "24h",
        postsCount: 5,
        photosCount: 8,
        ring1Contributors: [],
        lastActivityAt: new Date().toISOString(),
      },
    };
    expect(assignTileSize(item)).toBe("lg");
  });
});
