import { describe, it, expect } from "vitest";
import { profileLogCardImageUrl } from "@/features/profile/utils/profileLogCardImageUrl";
import type { FeedReview } from "@/types/feed";

const baseEntry = (over: Partial<FeedReview> = {}): FeedReview =>
  ({
    id: "r1",
    content: null,
    rating: null,
    likes_count: 0,
    is_liked: false,
    comments_count: 0,
    created_at: "2024-01-01",
    status: "visited",
    user: { username: "u", avatar_url: null },
    building: {
      id: "b1",
      name: "Building",
      main_image_url: "storage/hero.jpg",
      community_preview_url: "storage/community.jpg",
      slug: "b",
      short_id: 1,
      creditedEntities: [],
    },
    images: [],
    ...over,
  }) as FeedReview;

describe("profileLogCardImageUrl", () => {
  it("Hero off: only user review image, no building fallback", () => {
    const url = profileLogCardImageUrl(
      baseEntry({
        images: [{ id: "i1", url: "https://cdn.example/u.jpg", likes_count: 0, is_liked: false }],
      }),
      false,
    );
    expect(url).toBe("https://cdn.example/u.jpg");
  });

  it("Hero off: null when user has no review images", () => {
    expect(profileLogCardImageUrl(baseEntry(), false)).toBeNull();
  });

  it("Hero on: building image when present", () => {
    const url = profileLogCardImageUrl(baseEntry(), true);
    expect(url).toBeTruthy();
    expect(url).toContain("hero.jpg");
  });

  it("Hero on: falls back to first user image when no building URLs", () => {
    const url = profileLogCardImageUrl(
      baseEntry({
        building: {
          id: "b1",
          name: "Building",
          main_image_url: null,
          community_preview_url: null,
          slug: "b",
          short_id: 1,
          creditedEntities: [],
        },
        images: [{ id: "i1", url: "https://cdn.example/u.jpg", likes_count: 0, is_liked: false }],
      }),
      true,
    );
    expect(url).toBe("https://cdn.example/u.jpg");
  });
});
