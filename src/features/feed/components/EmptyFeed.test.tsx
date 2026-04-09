import { render, screen, waitFor } from "@testing-library/react";
import { EmptyFeed } from "./EmptyFeed";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @vitest-environment happy-dom

// Mock hooks
vi.mock("@/features/feed/hooks/useSuggestedFeed", () => ({
  useSuggestedFeed: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user" } })),
}));

// Mock PeopleYouMayKnow
vi.mock("@/features/feed/components/PeopleYouMayKnow", () => ({
  PeopleYouMayKnow: () => <div data-testid="people-you-may-know">People You May Know</div>,
}));

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { useSuggestedFeed } from "@/features/feed/hooks/useSuggestedFeed";

describe("EmptyFeed", () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    vi.mocked(useSuggestedFeed).mockReset();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EmptyFeed />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders loading state", () => {
    vi.mocked(useSuggestedFeed).mockReturnValue({
      isLoading: true,
      data: null,
      toggleLike: vi.fn(),
      toggleImageLike: vi.fn(),
    } as ReturnType<typeof useSuggestedFeed>);
    const { container } = renderComponent();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders fallback when empty", async () => {
    vi.mocked(useSuggestedFeed).mockReturnValue({
      isLoading: false,
      data: { pages: [] },
      toggleLike: vi.fn(),
      toggleImageLike: vi.fn(),
    } as ReturnType<typeof useSuggestedFeed>);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /your feed is empty/i })).toBeTruthy();
    });
    expect(
      screen.getByText(/Follow others to see their building logs, ratings, and visits here\./),
    ).toBeTruthy();
  });

  it("renders suggestions when data exists", async () => {
    const now = new Date().toISOString();
    vi.mocked(useSuggestedFeed).mockReturnValue({
      isLoading: false,
      data: {
        pages: [
          [
            {
              id: "1",
              building: { name: "Test Building 1", id: "b1", slug: "test", short_id: "t1" },
              user: { username: "tester", avatar_url: null },
              likes_count: 5,
              comments_count: 2,
              is_liked: false,
              created_at: now,
            },
            {
              id: "2",
              building: { name: "Test Building 2", id: "b2", slug: "test2", short_id: "t2" },
              user: { username: "tester2", avatar_url: null },
              likes_count: 5,
              comments_count: 2,
              is_liked: false,
              created_at: now,
            },
            {
              id: "3",
              building: { name: "Test Building 3", id: "b3", slug: "test3", short_id: "t3" },
              user: { username: "tester3", avatar_url: null },
              likes_count: 5,
              comments_count: 2,
              is_liked: false,
              created_at: now,
            },
          ],
        ],
      },
      toggleLike: vi.fn(),
      toggleImageLike: vi.fn(),
    } as ReturnType<typeof useSuggestedFeed>);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("From the community")).toBeTruthy();
    });
    expect(screen.getByText("Test Building 1")).toBeTruthy();
    expect(screen.getByText("Test Building 2")).toBeTruthy();
    expect(screen.getByText("Test Building 3")).toBeTruthy();
    expect(screen.getByTestId("people-you-may-know")).toBeTruthy();
  });
});
