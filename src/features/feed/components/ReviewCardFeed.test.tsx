import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { ReviewCardFeed } from "./ReviewCardFeed";
import type { FeedReview } from "@/types/feed";
// @vitest-environment happy-dom

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock("@/features/profile/components/FollowButton", () => ({
  FollowButton: () => null,
}));

const baseEntry: FeedReview = {
  id: "rev-1",
  content: "A short visit note.",
  rating: null,
  created_at: "2026-01-15T12:00:00.000Z",
  edited_at: null,
  status: "visited",
  user_id: "user-1",
  user: {
    username: "pat",
    avatar_url: null,
    is_verified_architect: false,
    is_architect_of_building: false,
    followers_count: null,
  },
  building: {
    id: "b-1",
    short_id: 1,
    slug: "test-tower",
    name: "Test Tower",
    address: "1 Main St, Springfield, IL",
    main_image_url: null,
  },
  likes_count: 2,
  comments_count: 1,
  is_liked: false,
};

describe("ReviewCardFeed", () => {
  it("renders building title and author for a standard feed entry", () => {
    render(
      <MemoryRouter>
        <ReviewCardFeed entry={baseEntry} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("review-card-feed-rev-1")).toBeTruthy();
    expect(screen.getByText("Test Tower")).toBeTruthy();
    expect(screen.getByText("pat")).toBeTruthy();
  });

  it("applies elevated shadow when prominenceOverride is elevated", () => {
    const { container } = render(
      <MemoryRouter>
        <ReviewCardFeed entry={baseEntry} prominenceOverride="elevated" />
      </MemoryRouter>,
    );
    const article = container.querySelector('[data-testid="review-card-feed-rev-1"]');
    expect(article?.className).toContain("shadow-card-elevated");
  });
});
