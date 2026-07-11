// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router";
import { BuildingMasthead } from "./BuildingMasthead";
import type { BuildingCreditWithEntities } from "../../credits/types";
import type { BuildingDetails } from "../pages/BuildingDetails";

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const makeBuilding = (over: Partial<BuildingDetails> = {}): BuildingDetails => ({
  id: "b1",
  name: "Villa Savoye",
  location: null,
  address: null,
  city: "Poissy",
  country: "France",
  year_completed: 1931,
  styles: [],
  created_by: "u1",
  hero_image_id: null,
  ...over,
});

const personCredit = (over: Partial<BuildingCreditWithEntities> = {}): BuildingCreditWithEntities =>
  ({
    id: "c1",
    buildingId: "b1",
    personId: "p1",
    companyId: null,
    role: "design_architecture",
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
    addedByUserId: null,
    displayOrder: 0,
    createdAt: "2020-01-01T00:00:00Z",
    updatedAt: "2020-01-01T00:00:00Z",
    person: { id: "p1", name: "Le Corbusier", slug: "le-corbusier" },
    company: null,
    note: null,
    ...over,
  }) as BuildingCreditWithEntities;

function renderMasthead(
  building: BuildingDetails,
  credits: BuildingCreditWithEntities[] = [],
  isStatusBuilding = false,
) {
  return render(
    <BrowserRouter>
      <BuildingMasthead
        building={building}
        buildingCredits={credits}
        isStatusBuilding={isStatusBuilding}
        visitorCount={5}
        totalRatingPoints={15}
        buildingUrl="/building/b1/villa-savoye"
      />
    </BrowserRouter>,
  );
}

describe("BuildingMasthead", () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the h1 with the brand trailing period", () => {
    renderMasthead(makeBuilding());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Villa Savoye.");
  });

  it("composes the architect line with a linked credit and completion year", () => {
    renderMasthead(makeBuilding(), [personCredit()]);
    const link = screen.getByRole("link", { name: "Le Corbusier" });
    expect(link.getAttribute("href")).toBe("/person/le-corbusier");
    expect(screen.getByText(/completed 1931\./)).toBeTruthy();
  });

  it("falls back to the century when no completion year is known", () => {
    renderMasthead(
      makeBuilding({ year_completed: 0, century: 19 }),
      [personCredit()],
    );
    expect(screen.getByText(/completed 19th c\./)).toBeTruthy();
  });

  it("shows tier-rank and status chips", () => {
    renderMasthead(
      makeBuilding({ tier_rank: "Top 1%", status: "Demolished" }),
      [],
      true,
    );
    expect(screen.getByText("Top 1%")).toBeTruthy();
    expect(screen.getByText(/lost/i)).toBeTruthy();
  });

  it("copies the URL to the clipboard when Web Share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderMasthead(makeBuilding());
    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/building/b1/villa-savoye`,
    );
  });

  it("shows visit and point stats", () => {
    renderMasthead(makeBuilding());
    expect(screen.getByText("Visits")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("Points")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();
  });
});
