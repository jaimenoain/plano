// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import type { User } from "@supabase/supabase-js";
import { BuildingInfoTab } from "./BuildingInfoTab";
import type { TopLink } from "../hooks/useBuildingInteractions";
import type { BuildingDetails } from "../pages/BuildingDetails";

const { useAwardsByBuildingMock } = vi.hoisted(() => ({
  useAwardsByBuildingMock: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("../../awards/hooks/useAwards", () => ({
  useAwardsByBuilding: useAwardsByBuildingMock,
}));

const makeBuilding = (over: Partial<BuildingDetails> = {}): BuildingDetails => ({
  id: "b1",
  short_id: 99,
  slug: "villa-savoye",
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

const LINKS: TopLink[] = [
  { link_id: "l1", url: "https://example.com/essay", title: "An essay", like_count: 4 },
  { link_id: "l2", url: "https://archive.org/plans", title: "", like_count: 0 },
] as TopLink[];

function renderTab({
  building = makeBuilding({
    typology: ["Private residence"],
    styles: [{ id: "s1", name: "International" }],
    materials: ["Concrete"],
  }),
  topLinks = LINKS,
  user = { id: "u1" } as User,
  showLinkEditor = false,
  setShowLinkEditor = vi.fn(),
}: {
  building?: BuildingDetails;
  topLinks?: TopLink[];
  user?: User | null;
  showLinkEditor?: boolean;
  setShowLinkEditor?: (v: boolean) => void;
} = {}) {
  render(
    <MemoryRouter>
      <BuildingInfoTab
        building={building}
        buildingCredits={[]}
        topLinks={topLinks}
        user={user}
        showLinkEditor={showLinkEditor}
        setShowLinkEditor={setShowLinkEditor}
        newLinkUrl=""
        setNewLinkUrl={vi.fn()}
        newLinkTitle=""
        setNewLinkTitle={vi.fn()}
        handleAddLink={vi.fn()}
        handleLinkLike={vi.fn().mockResolvedValue(undefined)}
        likedLinkIds={new Set()}
      />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("BuildingInfoTab", () => {
  it("sequences facts strip, dossier and References for a rich record", () => {
    renderTab();
    expect(screen.getByText("Poissy, France")).toBeTruthy(); // strip cell
    expect(screen.getByText("Details")).toBeTruthy(); // dossier label
    expect(screen.getByRole("heading", { level: 2, name: "References" })).toBeTruthy();
    expect(screen.getByText("2 links")).toBeTruthy();
    expect(screen.getByRole("link", { name: /An essay/ })).toBeTruthy();
  });

  it("shows the References empty state whose cta opens the link editor", async () => {
    const setShowLinkEditor = vi.fn();
    renderTab({ topLinks: [], setShowLinkEditor });
    expect(screen.getByText("No links yet")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Add the first link/ }));
    expect(setShowLinkEditor).toHaveBeenCalledWith(true);
  });

  it("hides the empty-state cta and Add link toggle for signed-out visitors", () => {
    renderTab({ topLinks: [], user: null });
    expect(screen.queryByRole("button", { name: /Add the first link/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Add link/ })).toBeNull();
  });

  it("leads a bare record with one contribution prompt linking to edit", () => {
    renderTab({
      building: makeBuilding({ city: null, country: null, year_completed: 0 }),
    });
    expect(screen.getByText("No details yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Add details/ }).getAttribute("href")).toBe(
      "/building/99/villa-savoye/edit",
    );
    expect(screen.queryByText("Details")).toBeNull();
  });
});
