// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminCompanies from "./AdminCompanies";
import type { AdminCompanyListItem } from "@/features/admin/api/entity-management";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

const searchAdminCompanies = vi.fn();
const getCompanyStewardsWithProfiles = vi.fn();
const updateAdminCompanyClaimStatus = vi.fn();

vi.mock("@/features/admin/api/entity-management", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/api/entity-management")>();
  return {
    ...actual,
    searchAdminCompanies: (...args: unknown[]) =>
      searchAdminCompanies(...args) as ReturnType<typeof actual.searchAdminCompanies>,
    updateAdminCompanyClaimStatus: (...args: unknown[]) =>
      updateAdminCompanyClaimStatus(...args) as ReturnType<typeof actual.updateAdminCompanyClaimStatus>,
  };
});

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    getCompanyStewardsWithProfiles: (...args: unknown[]) =>
      getCompanyStewardsWithProfiles(...args) as ReturnType<typeof actual.getCompanyStewardsWithProfiles>,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        ilike: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    })),
  },
}));

const coRow: AdminCompanyListItem = {
  id: "co-1",
  name: "Acme Studio",
  slug: "acme-studio",
  claimStatus: "claimed",
  creditCount: 5,
  stewardCount: 2,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminCompanies />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminCompanies (QA 8.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    searchAdminCompanies.mockReset();
    getCompanyStewardsWithProfiles.mockReset();
    updateAdminCompanyClaimStatus.mockReset();
    searchAdminCompanies.mockImplementation(async (q: string) => {
      if (q.trim().toLowerCase().includes("ac")) return [coRow];
      return [];
    });
    getCompanyStewardsWithProfiles.mockResolvedValue([
      {
        id: "st-1",
        companyId: "co-1",
        userId: "u-owner",
        role: "owner",
        invitedBy: null,
        createdAt: "t",
        username: "owner_handle",
        avatarUrl: null,
      },
      {
        id: "st-2",
        companyId: "co-1",
        userId: "u-stew",
        role: "steward",
        invitedBy: null,
        createdAt: "t",
        username: "steward_handle",
        avatarUrl: null,
      },
    ]);
    updateAdminCompanyClaimStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("directory search lists companies; expanding stewards loads getCompanyStewardsWithProfiles", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    renderPage();

    await user.type(screen.getByLabelText(/Search companies directory/i), "ac");
    await vi.advanceTimersByTimeAsync(450);

    expect(await screen.findByText("Acme Studio")).toBeInTheDocument();
    expect(searchAdminCompanies).toHaveBeenCalledWith("ac");

    await user.click(screen.getByRole("button", { name: /View \(2\)/ }));

    await waitFor(() => {
      expect(getCompanyStewardsWithProfiles).toHaveBeenCalledWith("co-1");
    });
    expect(await screen.findByText("owner_handle")).toBeInTheDocument();
    expect(screen.getByText("steward_handle")).toBeInTheDocument();
  });

  it("claim status change calls updateAdminCompanyClaimStatus", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    renderPage();

    await user.type(screen.getByLabelText(/Search companies directory/i), "ac");
    await vi.advanceTimersByTimeAsync(450);
    await screen.findByText("Acme Studio");

    await user.click(screen.getByLabelText(/Claim status for Acme Studio/i));
    await user.click(await screen.findByRole("option", { name: /^Verified$/ }));

    await waitFor(() => {
      expect(updateAdminCompanyClaimStatus).toHaveBeenCalledWith("co-1", "verified");
    });
    expect(toast.success).toHaveBeenCalledWith("Claim status updated");
  });
});
