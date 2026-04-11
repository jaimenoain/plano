import type { ReactElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewCardFeed } from "./ReviewCardFeed";
import type { FeedReview } from "@/types/feed";
// @vitest-environment happy-dom

const queryClient = new QueryClient();

function renderWithProviders(ui: ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

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

vi.mock("@/features/profile/hooks/useUserBuildingStatuses", () => ({
  useUserBuildingStatuses: () => ({ statuses: {}, ratings: {} }),
}));

afterEach(() => {
  cleanup();
});

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
    renderWithProviders(<ReviewCardFeed entry={baseEntry} />);

    expect(screen.getByTestId("review-card-feed-rev-1")).toBeTruthy();
    expect(screen.getByText("Test Tower")).toBeTruthy();
    expect(screen.getByText("pat")).toBeTruthy();
  });

  it("renders save as bookmark control with accessible name on non-compact card", () => {
    renderWithProviders(<ReviewCardFeed entry={baseEntry} />);
    expect(
      screen.getByRole("button", { name: /save building to your list/i }),
    ).toBeTruthy();
  });
});
