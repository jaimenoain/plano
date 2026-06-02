// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@example.com" },
    signOut: vi.fn(),
  }),
}));

// Badge-count nav hooks: render with empty data so no QueryClient/network is needed.
vi.mock("@/features/awards/hooks/useAwards", () => ({
  useSuggestions: () => ({ data: [] }),
  useAwardClaimRequests: () => ({ data: [] }),
}));

// Intervention-flag query source: keep empty so the inline useQuery resolves to [].
vi.mock("@/features/admin/api/programme", () => ({
  fetchInterventionFlags: vi.fn().mockResolvedValue([]),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/admin" }),
  };
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe("AdminSidebar (QA 8.2 entity claims)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists Entity claims → /admin/claims and does not reference Architect claims", () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <SidebarProvider>
            <AdminSidebar />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const link = screen.getByRole("link", { name: /Entity claims/i });
    expect(link.getAttribute("href")).toBe("/admin/claims");
    expect(screen.queryByRole("link", { name: /Architect claims/i })).toBeNull();
  });
});
