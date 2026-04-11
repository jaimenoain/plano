// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import Profile from "./Profile";
import { MemoryRouter, Route, Routes } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

const mocks = vi.hoisted(() => {
  const mockChain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    then: (resolve: (v: unknown) => unknown) => unknown;
  } = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
  };

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockChain),
    storage: { from: vi.fn().mockReturnValue({ getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }) }) },
  };

  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    mockSupabase,
    mockChain,
    stableAuthUser: { id: "user-123", email: "test@example.com" },
    getClaimedPersonSummaryMock: vi.fn().mockResolvedValue(null),
    loaderProfile: {
      id: "user-123",
      username: "testuser",
      avatar_url: null as string | null,
      bio: "Bio",
    },
  };
});

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLoaderData: () => ({ profile: mocks.loaderProfile }),
  };
});

vi.mock("@/features/credits/api/people", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/people")>();
  return {
    ...actual,
    getClaimedPersonSummaryForProfile: (...args: unknown[]) => mocks.getClaimedPersonSummaryMock(...args),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.stableAuthUser,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/hooks/useIntersectionObserver", () => ({
  useIntersectionObserver: () => ({
    containerRef: { current: null },
    isVisible: false,
  }),
}));

vi.mock("@/features/profile/components/UserCard", () => ({
  UserCard: () => <div data-testid="user-card">User Card</div>,
}));

vi.mock("@/features/profile/components/SocialContextSection", () => ({
  SocialContextSection: () => <div data-testid="social-context">Social Context</div>,
}));

vi.mock("@/features/profile/components/FavoritesSection", () => ({
  FavoritesSection: () => <div data-testid="favorites-section">Favorites</div>,
}));

vi.mock("@/features/profile/components/ProfileHighlights", () => ({
  ProfileHighlights: () => <div data-testid="profile-highlights">Highlights</div>,
}));

vi.mock("@/features/profile/components/ProfileKanbanView", () => ({
  ProfileKanbanView: () => <div data-testid="kanban-view">Kanban</div>,
}));

vi.mock("@/features/collections/components/CollectionsGrid", () => ({
  CollectionsGrid: () => <div data-testid="collections-grid">Collections</div>,
}));

vi.mock("@/features/profile/components/FavoriteCollectionsGrid", () => ({
  FavoriteCollectionsGrid: () => <div data-testid="fav-collections-grid">Fav Collections</div>,
}));

vi.mock("@/features/feed/components/ReviewCardFeed", () => ({
  ReviewCardFeed: ({ entry }: { entry: { id: string; building: { name: string } } }) => (
    <div data-testid={`review-card-${entry.id}`}>{entry.building.name}</div>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mocks.mockSupabase,
}));

const mockBuildings = [
  {
    id: "review-1",
    content: "Great place",
    rating: 3,
    status: "visited",
    created_at: "2023-01-01",
    edited_at: "2023-01-02",
    building: { id: "b1", name: "Empire State", address: "NYC" },
  },
];

describe("Profile (QA 9.1 — portfolio tab)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.getClaimedPersonSummaryMock.mockReset();
    mocks.getClaimedPersonSummaryMock.mockResolvedValue(null);
    mocks.mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "user-123",
        username: "testuser",
        avatar_url: null,
        bio: "Test Bio",
        verified_architect_id: null,
      },
    });
    mocks.mockChain.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: mockBuildings, error: null });
    mocks.mockSupabase.from.mockReturnValue(mocks.mockChain);
  });

  afterEach(() => {
    cleanup();
  });

  function renderProfile(url: string) {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route
              path="/profile/:username"
              element={
                <SidebarProvider>
                  <Profile />
                </SidebarProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("portfolio section links to /portfolio and does not inline tier-grouped dashboard copy", async () => {
    mocks.getClaimedPersonSummaryMock.mockResolvedValue({
      id: "p1",
      name: "Alex Architect",
      slug: "alex-architect",
      creditCount: 4,
    });
    renderProfile("/profile/testuser?section=portfolio");

    const dash = await screen.findByRole("link", { name: /open portfolio dashboard/i });
    expect(dash).toHaveAttribute("href", "/portfolio");
    expect(screen.queryByRole("heading", { name: /primary credits/i })).toBeNull();
  });

  it("hides Portfolio tab when no claimed person even if profile still has legacy verified_architect_id", async () => {
    mocks.mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "user-123",
        username: "testuser",
        avatar_url: null,
        bio: "Test Bio",
        verified_architect_id: "00000000-0000-4000-8000-000000000099",
      },
    });
    mocks.getClaimedPersonSummaryMock.mockResolvedValue(null);

    renderProfile("/profile/testuser");

    await screen.findByTestId("review-card-review-1");

    await waitFor(() => {
      expect(mocks.getClaimedPersonSummaryMock).toHaveBeenCalledWith("user-123");
    });

    expect(screen.queryByRole("button", { name: /^Portfolio$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /open portfolio dashboard/i })).toBeNull();
  });
});
