// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import EntityClaims from "./EntityClaims";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const fetchOpenCompanyClaimDisputesForAdmin = vi.fn();
const resolveCompanyClaimDispute = vi.fn();

vi.mock("@/features/admin/api/entity-management", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/api/entity-management")>();
  return {
    ...actual,
    fetchOpenCompanyClaimDisputesForAdmin: (...args: unknown[]) =>
      fetchOpenCompanyClaimDisputesForAdmin(...args) as ReturnType<
        typeof actual.fetchOpenCompanyClaimDisputesForAdmin
      >,
    resolveCompanyClaimDispute: (...args: unknown[]) =>
      resolveCompanyClaimDispute(...args) as ReturnType<typeof actual.resolveCompanyClaimDispute>,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "architect_claims") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "people" || table === "companies") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    }),
  },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "a@test.com" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EntityClaims />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EntityClaims (QA 8.2)", () => {
  beforeEach(() => {
    fetchOpenCompanyClaimDisputesForAdmin.mockReset();
    resolveCompanyClaimDispute.mockReset();
    fetchOpenCompanyClaimDisputesForAdmin.mockResolvedValue([
      {
        id: "dispute-1",
        companyId: "c1",
        disputedByUserId: "u-dis",
        reason: "Not their company",
        evidenceUrl: "https://proof.example/evidence",
        createdAt: "2026-01-05T10:00:00.000Z",
        companyName: "Disputed Co",
        companySlug: "disputed-co",
        disputantUsername: "reporter_x",
      },
    ]);
    resolveCompanyClaimDispute.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows legacy architect claims tab and company disputes tab", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /Entity claims/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Legacy architect claims/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Company disputes/i })).toBeInTheDocument();
  });

  it("company disputes tab lists dispute and Resolved calls resolveCompanyClaimDispute", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/No pending architect claims/i);

    await user.click(screen.getByRole("tab", { name: /Company disputes/i }));

    expect(await screen.findByRole("link", { name: "Disputed Co" })).toHaveAttribute(
      "href",
      "/company/disputed-co",
    );
    expect(screen.getByText("reporter_x")).toBeInTheDocument();
    expect(screen.getByText(/Not their company/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Resolved$/ }));

    await waitFor(() => {
      expect(resolveCompanyClaimDispute).toHaveBeenCalledWith("dispute-1");
    });
    expect(toast.success).toHaveBeenCalledWith("Dispute marked resolved");
  });
});
