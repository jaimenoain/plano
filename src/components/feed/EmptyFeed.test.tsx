import { render, screen } from "@testing-library/react";
import { EmptyFeed } from "./EmptyFeed";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// @vitest-environment happy-dom

// Mock hooks
vi.mock("@/hooks/useSuggestedFeed", () => ({
  useSuggestedFeed: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user" } })),
}));

// Mock PeopleYouMayKnow
vi.mock("@/components/feed/PeopleYouMayKnow", () => ({
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

import { useSuggestedFeed } from "@/hooks/useSuggestedFeed";

describe("EmptyFeed", () => {
  const queryClient = new QueryClient();

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EmptyFeed />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders loading state", () => {
    (useSuggestedFeed as any).mockReturnValue({
      isLoading: true,
      data: null,
    });
    const { container } = renderComponent();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders fallback when empty", () => {
    (useSuggestedFeed as any).mockReturnValue({
      isLoading: false,
      data: { pages: [] },
    });
    renderComponent();
    expect(screen.getByText("Your feed is empty. Follow others to see their building logs and visits.")).toBeTruthy();
  });

  it("renders suggestions when data exists", () => {
    const now = new Date().toISOString();
    (useSuggestedFeed as any).mockReturnValue({
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
            }
          ],
        ],
      },
    });
    renderComponent();
    expect(screen.getByText("Welcome to Plano!")).toBeTruthy();
    expect(screen.getByText("Test Building 1")).toBeTruthy();
    expect(screen.getByText("Test Building 2")).toBeTruthy();
    expect(screen.getByText("Test Building 3")).toBeTruthy();

    // Check for PeopleYouMayKnow if we have 3 items (inserted at index 2, so after 3rd item? No, index 2 is 3rd item. So after 3rd item in map loop)
    // Code says: {index === 2 && <PeopleYouMayKnow />}
    // This renders it AFTER the 3rd item (index 0, 1, 2). Correct.
    expect(screen.getByTestId("people-you-may-know")).toBeTruthy();
  });
});
