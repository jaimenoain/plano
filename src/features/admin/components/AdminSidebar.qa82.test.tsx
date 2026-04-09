// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/admin" }),
  };
});

describe("AdminSidebar (QA 8.2 entity claims)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists Entity claims → /admin/claims and does not reference Architect claims", () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <AdminSidebar />
        </SidebarProvider>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Entity claims/i });
    expect(link.getAttribute("href")).toBe("/admin/claims");
    expect(screen.queryByRole("link", { name: /Architect claims/i })).toBeNull();
  });
});
