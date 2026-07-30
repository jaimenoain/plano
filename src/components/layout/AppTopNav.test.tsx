// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppTopNav } from "./AppTopNav";

const mocks = vi.hoisted(() => ({
  user: undefined as { id: string; email: string } | undefined,
  openWaitlistDialog: vi.fn(),
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
// thenable satisfies the whole chain.
vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: { count: number }) => void) => resolve({ count: 0 }),
  };
  return { supabase: { from: () => chain } };
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
  return render(
    <MemoryRouter>
      <AppTopNav />
    </MemoryRouter>,
  );
}

const hrefs = () =>
  screen.getAllByRole("link").map((link) => link.getAttribute("href"));

describe("AppTopNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      expect(screen.getByLabelText("Search")).toHaveAttribute("href", "/search");
      expect(screen.getByLabelText("Notifications")).toHaveAttribute(
        "href",
        "/notifications",
      );
      expect(screen.getByLabelText("Account menu")).toBeTruthy();
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
      expect(screen.getByLabelText("Search")).toHaveAttribute("href", "/search");
    });
  });
});
