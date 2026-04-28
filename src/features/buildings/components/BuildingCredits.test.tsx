// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BuildingCredits } from "./BuildingCredits";
import type { BuildingCreditWithEntities } from "@/features/credits/types";

const { flagCreditMock, toastMock, useIsMobileMock } = vi.hoisted(() => ({
  flagCreditMock: vi.fn(),
  toastMock: vi.fn(),
  useIsMobileMock: vi.fn(() => false),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock("@/features/credits/api/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/credits")>();
  return {
    ...actual,
    flagCredit: (...args: unknown[]) => flagCreditMock(...args),
  };
});

const baseCredit = (over: Partial<BuildingCreditWithEntities>): BuildingCreditWithEntities => ({
  id: over.id ?? "c1",
  buildingId: "b1",
  personId: over.personId ?? null,
  companyId: over.companyId ?? null,
  role: over.role ?? "design_architect",
  roleCustom: over.roleCustom ?? null,
  creditTier: over.creditTier ?? "primary",
  isLead: over.isLead ?? false,
  contributionNotes: over.contributionNotes ?? null,
  yearFrom: over.yearFrom ?? null,
  yearTo: over.yearTo ?? null,
  projectUrl: over.projectUrl ?? null,
  status: over.status ?? "active",
  flagReason: over.flagReason ?? null,
  flagNotes: over.flagNotes ?? null,
  flaggedAt: over.flaggedAt ?? null,
  flaggedFromStatus: over.flaggedFromStatus ?? null,
  flaggedByUserId: over.flaggedByUserId ?? null,
  addedByUserId: over.addedByUserId ?? null,
  displayOrder: over.displayOrder ?? 0,
  createdAt: over.createdAt ?? "2020-01-01T00:00:00Z",
  updatedAt: over.updatedAt ?? "2020-01-01T00:00:00Z",
  person: over.person ?? null,
  company: over.company ?? null,
});

function wrap(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("BuildingCredits", () => {
  beforeEach(() => {
    sessionStorage.clear();
    flagCreditMock.mockReset();
    toastMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
    flagCreditMock.mockImplementation(async () =>
      baseCredit({ id: "c1", status: "flagged", flagReason: "wrong_person" }),
    );
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("groups by tier and role; lead rows appear before non-lead within the same role", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "c-follow",
        isLead: false,
        displayOrder: 0,
        person: { id: "p1", name: "Follow Architect", slug: "follow" },
      }),
      baseCredit({
        id: "c-lead",
        isLead: true,
        displayOrder: 1,
        person: { id: "p2", name: "Lead Architect", slug: "lead" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    const region = screen.getByRole("region", { name: /primary credits/i });
    const links = within(region).getAllByRole("link");
    const leadIdx = links.findIndex((l) => l.textContent === "Lead Architect");
    const followIdx = links.findIndex((l) => l.textContent === "Follow Architect");
    expect(leadIdx).toBeGreaterThanOrEqual(0);
    expect(followIdx).toBeGreaterThanOrEqual(0);
    expect(leadIdx).toBeLessThan(followIdx);
  });

  it("shows verified badge only for verified credits", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "a",
        status: "active",
        person: { id: "p1", name: "Active Person", slug: "ap" },
      }),
      baseCredit({
        id: "v",
        status: "verified",
        person: { id: "p2", name: "Verified Person", slug: "vp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.getAllByLabelText("Verified credit")).toHaveLength(1);
  });

  it("keeps ancillary rows inside collapsed panel until expanded", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "anc",
        creditTier: "ancillary",
        person: { id: "p1", name: "Ancillary Name", slug: "ancillary-person" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.queryByRole("link", { name: "Ancillary Name" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /more credits/i }));
    expect(screen.getByRole("link", { name: "Ancillary Name" })).toBeTruthy();
  });

  it("shows Add a credit only when authenticated", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        person: { id: "p1", name: "Only", slug: "only" },
      }),
    ];
    const { rerender } = wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.queryByRole("button", { name: /add a credit/i })).toBeNull();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <BrowserRouter>
            <BuildingCredits buildingId="b1" credits={credits} isAuthenticated />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: /add a credit/i })).toBeTruthy();
  });

  it("hides flagged credits from non-admin viewers (QA 5.2)", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "f",
        status: "flagged",
        person: { id: "p1", name: "Flagged Person", slug: "fp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} isAdmin={false} />);
    expect(screen.queryByRole("link", { name: "Flagged Person" })).toBeNull();
    expect(screen.getByText(/No credits listed yet/i)).toBeInTheDocument();
  });

  it("shows flagged credits to admins with Flagged badge and no report control (QA 5.2)", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "f",
        status: "flagged",
        person: { id: "p1", name: "Flagged Person", slug: "fp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated isAdmin />);
    expect(screen.getByRole("link", { name: "Flagged Person" })).toBeInTheDocument();
    expect(screen.getByText("Flagged")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /report issue with this credit/i })).toBeNull();
  });

  it("hides report control for the rest of the session after submit", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "rep",
        person: { id: "p1", name: "Reporter Test", slug: "rt" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    await user.click(screen.getByRole("radio", { name: /wrong person/i }));
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(flagCreditMock).toHaveBeenCalledWith("rep", "wrong_person", null);
    expect(screen.queryByRole("button", { name: /report issue with this credit/i })).toBeNull();
  });
});

describe("BuildingCredits (QA 5.2)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    flagCreditMock.mockReset();
    toastMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("primary and contributor tiers visible by default; ancillary behind Show all credits", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "p1",
        creditTier: "primary",
        role: "design_architect",
        person: { id: "a", name: "Primary Arch", slug: "pa" },
      }),
      baseCredit({
        id: "co1",
        creditTier: "contributor",
        role: "structural_engineer",
        person: { id: "b", name: "Contributor Eng", slug: "ce" },
      }),
      baseCredit({
        id: "an1",
        creditTier: "ancillary",
        role: "landscape_architect",
        person: { id: "c", name: "Ancillary Land", slug: "al" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);

    expect(screen.getByRole("region", { name: /primary credits/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /contributor credits/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Primary Arch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contributor Eng" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ancillary Land" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /more credits/i }));
    expect(screen.getByRole("link", { name: "Ancillary Land" })).toBeInTheDocument();
  });

  it("renders Lead label on is_lead primary credit", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "lead",
        isLead: true,
        person: { id: "p1", name: "Lead Only", slug: "lo" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    const region = screen.getByRole("region", { name: /primary credits/i });
    expect(within(region).getByText("Lead")).toBeInTheDocument();
  });

  it("verified credit shows tooltip content on hover; active credit has no verified icon", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "a",
        status: "active",
        person: { id: "p1", name: "Active Only", slug: "ao" },
      }),
      baseCredit({
        id: "v",
        status: "verified",
        person: { id: "p2", name: "Verified Only", slug: "vo" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.getAllByLabelText("Verified credit")).toHaveLength(1);
    await user.hover(screen.getByLabelText("Verified credit"));
    expect(await screen.findByRole("tooltip", { name: "Verified credit" })).toBeInTheDocument();
  });

  it("shows contribution notes when set", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "n",
        contributionNotes: "Facade study and sun paths.",
        person: { id: "p1", name: "With Notes", slug: "wn" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.getByText("Facade study and sun paths.")).toBeInTheDocument();
  });

  it("project_url renders external link with https href and opens in new tab", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "pu",
        projectUrl: "example.org/project",
        person: { id: "p1", name: "Project Person", slug: "pp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    const ext = screen.getByRole("link", { name: "Open project link" });
    expect(ext).toHaveAttribute("href", "https://example.org/project");
    expect(ext).toHaveAttribute("target", "_blank");
    expect(ext).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders year_from–year_to range when both set", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "y",
        yearFrom: 2018,
        yearTo: 2023,
        person: { id: "p1", name: "Year Person", slug: "yp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    const region = screen.getByRole("region", { name: /primary credits/i });
    expect(within(region).getByText("2018–2023")).toBeInTheDocument();
  });

  it("renders no year line when year_from and year_to are both null", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "ny",
        yearFrom: null,
        yearTo: null,
        person: { id: "p1", name: "No Years", slug: "ny" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    const region = screen.getByRole("region", { name: /primary credits/i });
    expect(within(region).queryByText(/\d{4}–\d{4}/)).toBeNull();
  });
});

describe("BuildingCredits flag flow (QA 5.3)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    flagCreditMock.mockReset();
    toastMock.mockReset();
    useIsMobileMock.mockReturnValue(false);
    flagCreditMock.mockImplementation(async (creditId: string, reason: string, notes: string | null) =>
      baseCredit({
        id: creditId,
        status: "flagged",
        flagReason: reason as "wrong_role",
        flagNotes: notes,
        flaggedByUserId: null,
      }),
    );
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("opens popover with reason radios and optional notes on desktop", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({ id: "fx", person: { id: "p1", name: "Flag UX", slug: "fx" } }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    expect(screen.getByRole("group", { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /notes \(optional\)/i })).toBeInTheDocument();
  });

  it("opens bottom sheet on mobile viewport", async () => {
    const user = userEvent.setup();
    useIsMobileMock.mockReturnValue(true);
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({ id: "mb", person: { id: "p1", name: "Mobile", slug: "mb" } }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    expect(screen.getByRole("dialog", { name: /report credit/i })).toBeInTheDocument();
  });

  it("submit without choosing a reason shows validation toast and does not call flagCredit", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({ id: "nv", person: { id: "p1", name: "No Val", slug: "nv" } }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "Select a reason before submitting.",
      }),
    );
    expect(flagCreditMock).not.toHaveBeenCalled();
  });

  it("submits wrong_role with null notes (anonymous) via flagCredit", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({ id: "wr", person: { id: "p1", name: "Wrong Role", slug: "wr" } }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    await user.click(screen.getByRole("radio", { name: /wrong role/i }));
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    await vi.waitFor(() => {
      expect(flagCreditMock).toHaveBeenCalledWith("wr", "wrong_role", null);
    });
  });

  it("allows flagging a verified credit; RPC result stays flagged (not hidden)", async () => {
    const user = userEvent.setup();
    flagCreditMock.mockImplementation(async () =>
      baseCredit({
        id: "ver",
        status: "flagged",
        flagReason: "wrong_person",
        flaggedFromStatus: "verified",
      }),
    );
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "ver",
        status: "verified",
        person: { id: "p1", name: "Verified Target", slug: "vt" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    await user.click(screen.getByRole("radio", { name: /wrong person/i }));
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    await vi.waitFor(() => expect(flagCreditMock).toHaveBeenCalled());
    const ret = (await flagCreditMock.mock.results[0].value) as BuildingCreditWithEntities;
    expect(ret.status).toBe("flagged");
    expect(ret.status).not.toBe("hidden");
  });

  it("after flagging, clearing sessionStorage restores the report control on a fresh mount", async () => {
    const user = userEvent.setup();
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({ id: "sess", person: { id: "p1", name: "Session", slug: "sess" } }),
    ];
    const { unmount } = wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    await user.click(screen.getByRole("button", { name: /report issue with this credit/i }));
    await user.click(screen.getByRole("radio", { name: /wrong person/i }));
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    await vi.waitFor(() => expect(flagCreditMock).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /report issue with this credit/i })).toBeNull();
    unmount();
    sessionStorage.clear();
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
    expect(screen.getByRole("button", { name: /report issue with this credit/i })).toBeInTheDocument();
  });
});
