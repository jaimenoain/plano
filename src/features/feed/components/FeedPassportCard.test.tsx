import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedPassportCard } from "./FeedPassportCard";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: "u1" } })),
  useUserProfile: vi.fn(() => ({
    profile: { username: "jaime", avatar_url: null },
  })),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/profile/hooks/useUserProfile", () => ({
  useUserProfile: mocks.useUserProfile,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      // Thenable count builder: resolves the head-count each stat query awaits.
      const builder = {
        _status: null as string | null,
        select: () => builder,
        eq: (column: string, value: string) => {
          if (column === "status") builder._status = value;
          return builder;
        },
        then: (resolve: (value: { count: number; error: null }) => unknown) => {
          const count =
            table === "follows" ? 7 : builder._status === "visited" ? 3 : 5;
          return Promise.resolve({ count, error: null }).then(resolve);
        },
      };
      return builder;
    }),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeedPassportCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FeedPassportCard", () => {
  it("renders the three stats with their counts, linked into the profile", async () => {
    renderCard();

    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    expect(screen.getByText("Visited").closest("a")).toHaveAttribute(
      "href",
      "/profile?section=visited",
    );
    expect(screen.getByText("Saved").closest("a")).toHaveAttribute(
      "href",
      "/profile?section=saved",
    );
    expect(screen.getByText("Followers").closest("a")).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("renders nothing when logged out", () => {
    mocks.useAuth.mockReturnValue({ user: null as never });
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
  });
});
