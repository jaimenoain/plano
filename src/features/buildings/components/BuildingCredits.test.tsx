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

const flagCreditMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
    flagCreditMock.mockImplementation(async () =>
      baseCredit({ id: "c1", status: "flagged", flagReason: "wrong_person" }),
    );
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
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
    await user.click(screen.getByRole("button", { name: /show all credits/i }));
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

  it("hides report control for flagged credits", () => {
    const credits: BuildingCreditWithEntities[] = [
      baseCredit({
        id: "f",
        status: "flagged",
        person: { id: "p1", name: "Flagged Person", slug: "fp" },
      }),
    ];
    wrap(<BuildingCredits buildingId="b1" credits={credits} isAuthenticated={false} />);
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
    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(flagCreditMock).toHaveBeenCalledWith("rep", "wrong_person", null);
    expect(screen.queryByRole("button", { name: /report issue with this credit/i })).toBeNull();
  });
});
