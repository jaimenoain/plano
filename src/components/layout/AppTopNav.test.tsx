// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppTopNav } from "./AppTopNav";

const mocks = vi.hoisted(() => ({
  user: undefined as { id: string; email: string } | undefined,
  openWaitlistDialog: vi.fn(),
  unreadCount: 0,
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, signOut: vi.fn() }),
}));

vi.mock("@/features/waitlist/WaitlistSignupProvider", () => ({
  useWaitlistSignup: () => ({ openWaitlistDialog: mocks.openWaitlistDialog }),
}));

vi.mock("@/features/profile/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: { username: "testuser", avatar_url: "" } }),
}));

vi.mock("@/features/credits/hooks/useClaimedPersonForNav", () => ({
  useClaimedPersonForNav: () => ({ data: undefined }),
}));

vi.mock("@/features/credits/hooks/useStewardCompaniesForNav", () => ({
  useStewardCompaniesForNav: () => ({ data: [] }),
}));

vi.mock("@/features/ambassadors/hooks/useAmbassadorNavAccess", () => ({
  useAmbassadorNavAccess: () => ({ data: false }),
}));

// The unread-badge effect awaits `.from().select().eq().eq()`; one self-returning
// thenable satisfies the whole chain. Also stub the realtime channel the
// useUnreadNotifications hook subscribes on.
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: { count: number }) => void) => resolve({ count: mocks.unreadCount }),
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { from: () => chain, channel: () => channel, removeChannel: vi.fn() } };
});

// Radix portals don't settle in jsdom; render the menu inline.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

function renderNav() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppTopNav />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const hrefs = () =>
  screen.getAllByRole("link").map((link) => link.getAttribute("href"));

describe("AppTopNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unreadCount = 0;
  });

  // No `globals` in vitest.config.ts, so RTL never auto-cleans between tests.
  afterEach(() => {
    cleanup();
  });

  describe("signed in", () => {
    beforeEach(() => {
      mocks.user = { id: "u1", email: "test@example.com" };
    });

    it("offers no 'Log a visit' shortcut — visit logging is building-scoped", () => {
      renderNav();

      expect(screen.queryByText(/log a visit/i)).toBeNull();
      expect(hrefs()).not.toContain("/post");
    });

    it("renders the action cluster: search, notifications, account menu", () => {
      renderNav();

      expect(screen.getByLabelText("Search")).toHaveAttribute("href", "/map");
      expect(screen.getByLabelText("Notifications")).toHaveAttribute(
        "href",
        "/notifications",
      );
      expect(screen.getByLabelText("Account menu")).toBeTruthy();
    });

    // Regression test for the bell reliability fix (roadmap 6.3): the badge must
    // actually reflect the unread count, not just render statically at 0.
    it("shows the unread badge with a count when notifications are unread", async () => {
      mocks.unreadCount = 3;
      renderNav();

      await waitFor(() => {
        expect(screen.getByLabelText("Notifications (3 unread)")).toBeTruthy();
      });
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders no badge when there are no unread notifications", async () => {
      mocks.unreadCount = 0;
      renderNav();

      await waitFor(() => {
        expect(screen.getByLabelText("Notifications")).toBeTruthy();
      });
      expect(screen.queryByText(/unread/)).toBeNull();
    });
  });

  describe("signed out", () => {
    beforeEach(() => {
      mocks.user = undefined;
    });

    it("swaps the signed-in actions for the waitlist CTA", () => {
      renderNav();

      expect(screen.getByRole("button", { name: /join the waiting list/i })).toBeTruthy();
      expect(screen.queryByLabelText("Notifications")).toBeNull();
      expect(screen.getByLabelText("Search")).toHaveAttribute("href", "/map");
    });
  });
});
