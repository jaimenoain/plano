import { describe, expect, it } from "vitest";
import type { FeedReview } from "@/types/feed";
import {
  resolveCardSpec,
  resolveImageWeightFromCount,
  resolveLayoutFromWeights,
  resolveTextWeightFromWordCount,
} from "./resolveCardSpec";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
}

function baseReview(overrides: Partial<FeedReview> = {}): FeedReview {
  return {
    id: "r1",
    content: null,
    rating: null,
    created_at: "2020-01-01T00:00:00.000Z",
    user: {
      username: "author",
      avatar_url: null,
      followers_count: null,
    },
    building: { id: "b1", name: "Tower" },
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    ...overrides,
  };
}

describe("resolveTextWeightFromWordCount", () => {
  it("none for zero words", () => {
    expect(resolveTextWeightFromWordCount(0)).toBe("none");
  });
  it("snippet for 1–19 words", () => {
    expect(resolveTextWeightFromWordCount(1)).toBe("snippet");
    expect(resolveTextWeightFromWordCount(19)).toBe("snippet");
  });
  it("body for 20–149 words", () => {
    expect(resolveTextWeightFromWordCount(20)).toBe("body");
    expect(resolveTextWeightFromWordCount(149)).toBe("body");
  });
  it("essay for 150+ words", () => {
    expect(resolveTextWeightFromWordCount(150)).toBe("essay");
    expect(resolveTextWeightFromWordCount(500)).toBe("essay");
  });
});

describe("resolveImageWeightFromCount", () => {
  it("tiers 0 / 1 / 2 / 3+", () => {
    expect(resolveImageWeightFromCount(0)).toBe("none");
    expect(resolveImageWeightFromCount(1)).toBe("single");
    expect(resolveImageWeightFromCount(2)).toBe("pair");
    expect(resolveImageWeightFromCount(3)).toBe("gallery");
    expect(resolveImageWeightFromCount(99)).toBe("gallery");
  });
});

describe("resolveLayoutFromWeights", () => {
  it("covers full matrix keys", () => {
    expect(resolveLayoutFromWeights("none", "none")).toBe("compact-stack");
    expect(resolveLayoutFromWeights("gallery", "essay")).toBe("balanced");
    expect(resolveLayoutFromWeights("single", "essay")).toBe("text-forward");
  });
});

describe("resolveCardSpec", () => {
  it("no content + no images → compact-stack, standard prominence", () => {
    expect(resolveCardSpec(baseReview())).toEqual({
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "none",
      prominence: "standard",
    });
  });

  it("whitespace-only content counts as no text", () => {
    expect(resolveCardSpec(baseReview({ content: " \n\t " })).textWeight).toBe("none");
  });

  it("snippet text, no images", () => {
    const spec = resolveCardSpec(baseReview({ content: words(10) }));
    expect(spec).toMatchObject({
      textWeight: "snippet",
      imageWeight: "none",
      layout: "compact-stack",
    });
  });

  it("body text boundary at 20 words", () => {
    expect(resolveCardSpec(baseReview({ content: words(20) })).textWeight).toBe("body");
  });

  it("essay at 150 words", () => {
    expect(resolveCardSpec(baseReview({ content: words(150) })).textWeight).toBe("essay");
  });

  it("essay + no images → text-forward", () => {
    expect(resolveCardSpec(baseReview({ content: words(200) })).layout).toBe("text-forward");
  });

  it("likes_count > 50 → elevated", () => {
    expect(resolveCardSpec(baseReview({ likes_count: 51 })).prominence).toBe("elevated");
  });

  it("likes_count 50 is not elevated", () => {
    expect(resolveCardSpec(baseReview({ likes_count: 50 })).prominence).toBe("standard");
  });

  it("followers_count > 500 → elevated", () => {
    expect(
      resolveCardSpec(
        baseReview({
          user: { username: "x", avatar_url: null, followers_count: 501 },
        }),
      ).prominence,
    ).toBe("elevated");
  });

  it("followers_count 500 is not elevated", () => {
    expect(
      resolveCardSpec(
        baseReview({
          user: { username: "x", avatar_url: null, followers_count: 500 },
        }),
      ).prominence,
    ).toBe("standard");
  });

  it("null followers_count does not elevate", () => {
    expect(
      resolveCardSpec(
        baseReview({
          likes_count: 0,
          user: { username: "x", avatar_url: null, followers_count: null },
        }),
      ).prominence,
    ).toBe("standard");
  });

  it("is_verified_architect → elevated", () => {
    expect(
      resolveCardSpec(
        baseReview({
          user: {
            username: "x",
            avatar_url: null,
            followers_count: 0,
            is_verified_architect: true,
          },
        }),
      ).prominence,
    ).toBe("elevated");
  });

  it("is_architect_of_building → elevated", () => {
    expect(
      resolveCardSpec(
        baseReview({
          user: {
            username: "x",
            avatar_url: null,
            followers_count: null,
            is_architect_of_building: true,
          },
        }),
      ).prominence,
    ).toBe("elevated");
  });

  it("single image + no text → media-forward", () => {
    expect(
      resolveCardSpec(
        baseReview({
          images: [{ id: "i1", url: "https://example.com/a.jpg", likes_count: 0, is_liked: false }],
        }),
      ),
    ).toMatchObject({
      imageWeight: "single",
      textWeight: "none",
      layout: "media-forward",
    });
  });

  it("pair images + snippet → balanced", () => {
    expect(
      resolveCardSpec(
        baseReview({
          content: words(5),
          images: [
            { id: "a", url: "/a", likes_count: 0, is_liked: false },
            { id: "b", url: "/b", likes_count: 0, is_liked: false },
          ],
        }),
      ).layout,
    ).toBe("balanced");
  });

  it("gallery + essay → balanced", () => {
    expect(
      resolveCardSpec(
        baseReview({
          content: words(160),
          images: [
            { id: "a", url: "/a", likes_count: 0, is_liked: false },
            { id: "b", url: "/b", likes_count: 0, is_liked: false },
            { id: "c", url: "/c", likes_count: 0, is_liked: false },
          ],
        }),
      ),
    ).toMatchObject({
      imageWeight: "gallery",
      textWeight: "essay",
      layout: "balanced",
    });
  });

  it("gallery + no text → media-forward", () => {
    expect(
      resolveCardSpec(
        baseReview({
          images: [
            { id: "a", url: "/a", likes_count: 0, is_liked: false },
            { id: "b", url: "/b", likes_count: 0, is_liked: false },
            { id: "c", url: "/c", likes_count: 0, is_liked: false },
          ],
        }),
      ).layout,
    ).toBe("media-forward");
  });

  it("single + essay → text-forward", () => {
    expect(
      resolveCardSpec(
        baseReview({
          content: words(200),
          images: [{ id: "a", url: "/a", likes_count: 0, is_liked: false }],
        }),
      ).layout,
    ).toBe("text-forward");
  });

  it("undefined images → none imageWeight", () => {
    const r = baseReview();
    delete (r as Partial<FeedReview>).images;
    expect(resolveCardSpec(r).imageWeight).toBe("none");
  });

  it("empty images array", () => {
    expect(resolveCardSpec(baseReview({ images: [] })).imageWeight).toBe("none");
  });

  it("filters images with empty or whitespace URL", () => {
    expect(
      resolveCardSpec(
        baseReview({
          images: [
            { id: "a", url: "", likes_count: 0, is_liked: false },
            { id: "b", url: "   ", likes_count: 0, is_liked: false },
            { id: "c", url: "/ok", likes_count: 0, is_liked: false },
          ],
        }),
      ).imageWeight,
    ).toBe("single");
  });

  it("all broken image URLs → none + text-forward for long body", () => {
    expect(
      resolveCardSpec(
        baseReview({
          content: words(25),
          images: [
            { id: "a", url: "", likes_count: 0, is_liked: false },
            { id: "b", url: "", likes_count: 0, is_liked: false },
          ],
        }),
      ),
    ).toMatchObject({
      imageWeight: "none",
      textWeight: "body",
      layout: "text-forward",
    });
  });

  it("missing user optional flags still resolves", () => {
    const r = baseReview({
      user: { username: null, avatar_url: null, followers_count: null },
    });
    expect(resolveCardSpec(r).prominence).toBe("standard");
  });
});
