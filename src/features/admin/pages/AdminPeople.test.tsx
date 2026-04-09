// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminPeople from "./AdminPeople";
import type { AdminPersonListItem } from "@/features/admin/api/entity-management";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

const searchAdminPeople = vi.fn();
const updateAdminPersonClaimStatus = vi.fn();
const adminMergePeople = vi.fn();

vi.mock("@/features/admin/api/entity-management", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/admin/api/entity-management")>();
  return {
    ...actual,
    searchAdminPeople: (...args: unknown[]) =>
      searchAdminPeople(...args) as ReturnType<typeof actual.searchAdminPeople>,
    updateAdminPersonClaimStatus: (...args: unknown[]) =>
      updateAdminPersonClaimStatus(...args) as ReturnType<typeof actual.updateAdminPersonClaimStatus>,
    adminMergePeople: (...args: unknown[]) =>
      adminMergePeople(...args) as ReturnType<typeof actual.adminMergePeople>,
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminPeople />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const personA: AdminPersonListItem = {
  id: "target-id",
  name: "Target Person",
  slug: "target-person",
  claimStatus: "unclaimed",
  creditCount: 2,
};

const personB: AdminPersonListItem = {
  id: "source-id",
  name: "Source Person",
  slug: "source-person",
  claimStatus: "unclaimed",
  creditCount: 1,
};

describe("AdminPeople (QA 8.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    searchAdminPeople.mockReset();
    updateAdminPersonClaimStatus.mockReset();
    adminMergePeople.mockReset();
    searchAdminPeople.mockImplementation(async (q: string) => {
      const t = q.trim().toLowerCase();
      if (t.includes("dir")) {
        return [personA];
      }
      return [personA, personB];
    });
    updateAdminPersonClaimStatus.mockResolvedValue(undefined);
    adminMergePeople.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("directory search (≥2 chars) lists people from searchAdminPeople", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    renderPage();

    await user.type(screen.getByLabelText(/Search people directory/i), "dir");
    await vi.advanceTimersByTimeAsync(450);

    expect(await screen.findByRole("link", { name: /\/target-person/i })).toBeInTheDocument();
    expect(screen.getByText("Target Person")).toBeInTheDocument();
    expect(searchAdminPeople).toHaveBeenCalledWith("dir");
  });

  it("claim status Select calls updateAdminPersonClaimStatus with verified", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    renderPage();

    await user.type(screen.getByLabelText(/Search people directory/i), "dir");
    await vi.advanceTimersByTimeAsync(450);
    await screen.findByText("Target Person");

    const statusTrigger = screen.getByLabelText(/Claim status for Target Person/i);
    await user.click(statusTrigger);
    await user.click(await screen.findByRole("option", { name: /^Verified$/ }));

    await waitFor(() => {
      expect(updateAdminPersonClaimStatus).toHaveBeenCalledWith("target-id", "verified");
    });
    expect(toast.success).toHaveBeenCalledWith("Claim status updated");
  });

  it("Confirm merge calls adminMergePeople(sourceId, targetId)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
    renderPage();

    await user.type(screen.getByLabelText(/Search target person/i), "any");
    await vi.advanceTimersByTimeAsync(450);
    const targetDropdown = await screen.findByRole("button", { name: /Target Person/i });
    await user.click(targetDropdown);

    await user.type(screen.getByLabelText(/Search source person/i), "any");
    await vi.advanceTimersByTimeAsync(450);
    const sourceBtn = await screen.findByRole("button", { name: /Source Person/i });
    await user.click(sourceBtn);

    await user.click(screen.getByRole("button", { name: /Merge people/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /Confirm merge/i }));

    await waitFor(() => {
      expect(adminMergePeople).toHaveBeenCalledWith("source-id", "target-id");
    });
    expect(toast.success).toHaveBeenCalled();
  });
});
