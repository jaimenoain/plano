// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BrowserRouter } from "react-router";

const navMocks = vi.hoisted(() => ({
  stewardCompanies: [] as { companyId: string; name: string; slug: string }[],
}));

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
  useClaimedPersonForNav: () => ({ data: undefined }),
}));

vi.mock("@/features/credits/hooks/useStewardCompaniesForNav", () => ({
  useStewardCompaniesForNav: () => ({ data: navMocks.stewardCompanies }),
}));

vi.mock("@/features/ambassadors/hooks/useAmbassadorNavAccess", () => ({
  useAmbassadorNavAccess: () => ({ data: false }),
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

describe("AppSidebar (QA 9.2 — company steward nav)", () => {
  beforeEach(() => {
    document.cookie = "sidebar:state=; Max-Age=0; path=/;";
    navMocks.stewardCompanies = [];
  });

  it("renders a single company name linking to /company-portfolio when user stewards one company", () => {
    navMocks.stewardCompanies = [{ companyId: "c1", name: "Acme Studio", slug: "acme-studio" }];

    render(
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </BrowserRouter>,
    );

    const link = screen.getByRole("link", { name: /acme studio/i });
    expect(link).toHaveAttribute("href", "/company-portfolio");
  });

  it("renders My companies with per-company links including ?company= slug when user stewards multiple", () => {
    navMocks.stewardCompanies = [
      { companyId: "c1", name: "Alpha Ltd", slug: "alpha-ltd" },
      { companyId: "c2", name: "Beta GmbH", slug: "beta-gmbh" },
    ];

    render(
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </BrowserRouter>,
    );

    expect(screen.getByRole("button", { name: /my companies/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alpha ltd/i })).toHaveAttribute(
      "href",
      "/company-portfolio?company=alpha-ltd",
    );
    expect(screen.getByRole("link", { name: /beta gmbh/i })).toHaveAttribute(
      "href",
      "/company-portfolio?company=beta-gmbh",
    );
  });
});
