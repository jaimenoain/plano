// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import FlaggedCredits from "./FlaggedCredits";
import type { BuildingCreditWithEntities, FlaggedCreditModerationItem } from "@/features/credits/types";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const getFlaggedCreditsForAdmin = vi.fn();
const updateCreditStatus = vi.fn();
const notifyCreditOutcome = vi.fn();

vi.mock("@/features/credits/api/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/credits")>();
  return {
    ...actual,
    getFlaggedCreditsForAdmin: (...args: unknown[]) =>
      getFlaggedCreditsForAdmin(...args) as ReturnType<typeof actual.getFlaggedCreditsForAdmin>,
    updateCreditStatus: (...args: unknown[]) =>
      updateCreditStatus(...args) as ReturnType<typeof actual.updateCreditStatus>,
    notifyCreditOutcome: (...args: unknown[]) =>
      notifyCreditOutcome(...args) as ReturnType<typeof actual.notifyCreditOutcome>,
  };
});

function mkCredit(overrides: Partial<FlaggedCreditModerationItem> = {}): FlaggedCreditModerationItem {
  const base: FlaggedCreditModerationItem = {
    id: "credit-1",
    buildingId: "b1",
    personId: "p1",
    companyId: null,
    role: "design_architect",
    roleCustom: null,
    creditTier: "primary",
    isLead: true,
    contributionNotes: null,
    yearFrom: null,
    yearTo: null,
    projectUrl: null,
    status: "flagged",
    flagReason: "wrong_role",
    flagNotes: "Should be structural engineer.",
    flaggedAt: "2026-01-01T12:00:00.000Z",
    flaggedFromStatus: "active",
    flaggedByUserId: "flagger-1",
    addedByUserId: "adder-uuid",
    displayOrder: 0,
    createdAt: "t0",
    updatedAt: "t0",
    person: { id: "p1", name: "Pat Lee", slug: "pat-lee", claimStatus: "unclaimed" },
    company: null,
    building: { id: "b1", name: "Design Tower", slug: "design-tower", shortId: 42 },
    addedByUsername: "contributor_x",
  };
  return { ...base, ...overrides };
}

const stubUpdated: BuildingCreditWithEntities = {
  id: "credit-1",
  buildingId: "b1",
  personId: "p1",
  companyId: null,
  role: "design_architect",
  roleCustom: null,
  creditTier: "primary",
  isLead: true,
  contributionNotes: null,
  yearFrom: null,
  yearTo: null,
  projectUrl: null,
  status: "active",
  flagReason: null,
  flagNotes: null,
  flaggedAt: null,
  flaggedFromStatus: null,
  flaggedByUserId: null,
  addedByUserId: "adder-uuid",
  displayOrder: 0,
  createdAt: "t0",
  updatedAt: "t0",
  person: { id: "p1", name: "Pat Lee", slug: "pat-lee" },
  company: null,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FlaggedCredits />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FlaggedCredits (QA 8.1)", () => {
  beforeEach(() => {
    getFlaggedCreditsForAdmin.mockClear();
    updateCreditStatus.mockClear();
    notifyCreditOutcome.mockClear();
    (toast.success as ReturnType<typeof vi.fn>).mockClear();
    (toast.error as ReturnType<typeof vi.fn>).mockClear();
    getFlaggedCreditsForAdmin.mockResolvedValue([mkCredit()]);
    updateCreditStatus.mockResolvedValue(stubUpdated);
    notifyCreditOutcome.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders flag reason, notes, flagged time, building link, credited person link, and added-by profile link", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: /Flagged credits/i })).toBeInTheDocument();
    expect(await screen.findByText("Wrong role")).toBeInTheDocument();
    expect(screen.getByText("Should be structural engineer.")).toBeInTheDocument();

    const buildingLink = screen.getByRole("link", { name: "Design Tower" });
    expect(buildingLink.getAttribute("href")).toBe("/building/42/design-tower");

    const personLink = screen.getByRole("link", { name: "Pat Lee" });
    expect(personLink.getAttribute("href")).toBe("/person/pat-lee");

    const addedBy = screen.getByRole("link", { name: "@contributor_x" });
    expect(addedBy.getAttribute("href")).toBe("/profile/contributor_x");

    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
  });

  it("renders company link when credit is company-only", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([
      mkCredit({
        personId: null,
        person: null,
        companyId: "c1",
        company: { id: "c1", name: "StructCo", slug: "structco", claimStatus: "unclaimed" },
      }),
    ]);
    renderPage();

    const link = await screen.findByRole("link", { name: "StructCo" });
    expect(link.getAttribute("href")).toBe("/company/structco");
  });

  it("shows added_by user id when username is missing", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([mkCredit({ addedByUsername: null })]);
    renderPage();

    expect(await screen.findByText("adder-uuid")).toBeInTheDocument();
  });

  it('Dismiss flag sets status active and does not notify contributor', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Design Tower" });

    await user.click(screen.getByRole("button", { name: /Dismiss flag/i }));

    await waitFor(() => {
      expect(updateCreditStatus).toHaveBeenCalledWith("credit-1", { status: "active" });
    });
    expect(notifyCreditOutcome).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Flag dismissed — credit is active again.");
  });

  it("Verify sets verified and notifies contributor when added_by is set", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Design Tower" });

    await user.click(screen.getByRole("button", { name: /^Verify$/ }));

    await waitFor(() => {
      expect(updateCreditStatus).toHaveBeenCalledWith("credit-1", { status: "verified" });
      expect(notifyCreditOutcome).toHaveBeenCalledWith({
        creditId: "credit-1",
        outcome: "verified",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Credit marked verified.");
  });

  it("Hide sets hidden and notifies contributor", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Design Tower" });

    await user.click(screen.getByRole("button", { name: /^Hide$/ }));

    await waitFor(() => {
      expect(updateCreditStatus).toHaveBeenCalledWith("credit-1", { status: "hidden" });
      expect(notifyCreditOutcome).toHaveBeenCalledWith({
        creditId: "credit-1",
        outcome: "hidden",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Credit hidden from the building page.");
  });

  it("Verify does not call notify when added_by is absent", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([mkCredit({ addedByUserId: null, addedByUsername: null })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Design Tower" });

    await user.click(screen.getByRole("button", { name: /^Verify$/ }));

    await waitFor(() => {
      expect(updateCreditStatus).toHaveBeenCalledWith("credit-1", { status: "verified" });
    });
    expect(notifyCreditOutcome).not.toHaveBeenCalled();
  });

  it("shows previously-verified warning and no auto-hide countdown for verified-origin flags", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([
      mkCredit({
        flaggedFromStatus: "verified",
        person: { id: "p1", name: "Pat Lee", slug: "pat-lee", claimStatus: "unclaimed" },
      }),
    ]);
    renderPage();

    expect(await screen.findByText(/Previously verified/i)).toBeInTheDocument();
    expect(screen.getByText(/No auto-hide \(was verified\)/i)).toBeInTheDocument();
  });

  it("shows informational auto-hide countdown (title + non-placeholder copy) when policy window applies", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([
      mkCredit({
        flaggedAt: "2026-01-01T12:00:00.000Z",
        flaggedFromStatus: "active",
        person: { id: "p1", name: "Pat Lee", slug: "pat-lee", claimStatus: "unclaimed" },
        company: null,
      }),
    ]);
    renderPage();

    const table = await screen.findByRole("table");
    const countdown = within(table).getByTitle(
      /Informational: credits on fully unclaimed entities align with a 30-day policy window/i,
    );
    expect(countdown.textContent).toMatch(/left|Past auto-hide window/i);
    expect(countdown.textContent).not.toBe("—");
  });

  it("toasts error when notify fails after status update", async () => {
    notifyCreditOutcome.mockRejectedValue(new Error("mail down"));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Design Tower" });

    await user.click(screen.getByRole("button", { name: /^Verify$/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Status updated, but the contributor email could not be sent.",
      );
    });
  });

  it("shows empty queue copy when there are no rows", async () => {
    getFlaggedCreditsForAdmin.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No flagged credits in the queue/i)).toBeInTheDocument();
  });

  it("shows error copy when the query fails", async () => {
    getFlaggedCreditsForAdmin.mockRejectedValue(new Error("network"));
    renderPage();
    expect(await screen.findByText(/Failed to load flagged credits/i)).toBeInTheDocument();
  });
});
