// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BrowserRouter } from "react-router";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "test@example.com" },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/profile/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    profile: { username: "testuser", avatar_url: null },
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/features/credits/hooks/useClaimedPersonForNav", () => ({
  useClaimedPersonForNav: () => ({
    data: { id: "p1", name: "Pat", slug: "pat", creditCount: 3 },
  }),
}));

vi.mock("@/features/credits/hooks/useStewardCompaniesForNav", () => ({
  useStewardCompaniesForNav: () => ({ data: [] }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

describe("AppSidebar (QA 9.1 — person portfolio nav)", () => {
  beforeEach(() => {
    document.cookie = "sidebar:state=; Max-Age=0; path=/;";
  });

  it("renders My portfolio link to /portfolio when the user has a claimed person row", () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </BrowserRouter>,
    );

    const links = screen.getAllByRole("link", { name: /my portfolio/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links.every((l) => l.getAttribute("href") === "/portfolio")).toBe(true);
  });
});
