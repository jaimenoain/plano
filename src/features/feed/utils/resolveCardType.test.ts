import { describe, expect, it } from "vitest";
import type { FeedReview } from "@/types/feed";
import {
  CARD_B_HEIGHT,
  CARD_C_IMAGE_HEIGHT,
  resolveCardType,
} from "./resolveCardType";

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

const sampleImage = {
  id: "img1",
  url: "https://example.com/a.jpg",
  likes_count: 0,
  is_liked: false,
};

describe("resolveCardType", () => {
  it("exports layout constants", () => {
    expect(CARD_B_HEIGHT).toBe(320);
    expect(CARD_C_IMAGE_HEIGHT).toBe(185);
  });

  it("returns activity when no text and no media", () => {
    expect(resolveCardType(baseReview())).toBe("activity");
  });

  it("returns activity for whitespace-only content and no media", () => {
    expect(resolveCardType(baseReview({ content: " \n\t " }))).toBe("activity");
  });

  it("returns activity for empty string content and no media", () => {
    expect(resolveCardType(baseReview({ content: "" }))).toBe("activity");
  });

  it("returns activity when images array is empty and no video", () => {
    expect(resolveCardType(baseReview({ images: [] }))).toBe("activity");
  });

  it("returns activity when images exist but all URLs are empty", () => {
    expect(
      resolveCardType(
        baseReview({
          images: [
            { id: "1", url: "", likes_count: 0, is_liked: false },
            { id: "2", url: "   ", likes_count: 0, is_liked: false },
          ],
        }),
      ),
    ).toBe("activity");
  });

  it("returns C when there is usable media but no text", () => {
    expect(resolveCardType(baseReview({ images: [sampleImage] }))).toBe("C");
  });

  it("returns C for video only with no review text", () => {
    expect(
      resolveCardType(
        baseReview({ video_url: "https://example.com/v.mp4" }),
      ),
    ).toBe("C");
  });

  it("returns A when there is text but no media", () => {
    expect(resolveCardType(baseReview({ content: "Great building." }))).toBe("A");
  });

  it("returns B when there is text and images", () => {
    expect(
      resolveCardType(
        baseReview({ content: "Nice light.", images: [sampleImage] }),
      ),
    ).toBe("B");
  });

  it("returns B when there is text and video", () => {
    expect(
      resolveCardType(
        baseReview({
          content: "Walkthrough notes",
          video_url: "https://example.com/v.mp4",
        }),
      ),
    ).toBe("B");
  });

  it("treats missing images as no media when content exists", () => {
    const r = baseReview({ content: "Only words" });
    delete (r as Partial<FeedReview>).images;
    expect(resolveCardType(r)).toBe("A");
  });
});
