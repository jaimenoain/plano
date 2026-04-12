import type { ReactNode } from "react";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
import { SidebarProvider } from "@/components/ui/sidebar";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Index from "./Index";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useFeed } from "../hooks/useFeed";
import { useSuggestedFeed } from "../hooks/useSuggestedFeed";
import { useCollectionsFeed } from "../hooks/useCollectionsFeed";

vi.mock("@/features/auth/hooks/useAuth");
vi.mock("../hooks/useFeed");
vi.mock("../hooks/useSuggestedFeed");
vi.mock("../hooks/useCollectionsFeed");
vi.mock("@/hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => ({ containerRef: null, isVisible: false }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

const queryClient = new QueryClient();

const minimalFeedReview = {
  id: "r1",
  content: "Nice building",
  rating: 4,
  created_at: new Date().toISOString(),
  status: "published",
  user: { username: "archfan", avatar_url: null, followers_count: null },
  building: { id: "b1", name: "Test Building", main_image_url: null as string | null },
  likes_count: 0,
  comments_count: 0,
  is_liked: false,
  images: [] as { id: string; url: string; likes_count: number; is_liked: boolean }[],
};

describe("Index Page", () => {
  beforeEach(() => {
    (useAuth as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      user: { id: "test-user", user_metadata: { onboarding_completed: true } },
      loading: false,
    });

    (useFeed as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      data: { pages: [[minimalFeedReview]] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
      toggleLike: vi.fn(),
      toggleImageLike: vi.fn(),
    });

    (useSuggestedFeed as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      data: { pages: [[]] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
      toggleLike: vi.fn(),
      toggleImageLike: vi.fn(),
    });

    (useCollectionsFeed as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      data: { pages: [[]] },
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
    });
  });

  it("renders aggregated social content when the user has feed items", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SidebarProvider>
            <Index />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("app-layout")).toBeTruthy();
    expect(screen.getByTestId("feed-card-a-r1")).toBeTruthy();
    expect(screen.getAllByText("Test Building").length).toBeGreaterThanOrEqual(1);
  });
});
