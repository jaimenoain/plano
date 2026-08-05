// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { BuildingOverviewTab } from "./BuildingOverviewTab";
import type { StreamBlock } from "../utils/streamBlocks";
import type { BuildingDetails } from "../pages/BuildingDetails";

// Related-buildings sections query Supabase; the empty state is what's under test.
vi.mock("./RelatedBuildings", () => ({
  RelatedByArchitectSection: () => null,
  RelatedByCitySection: () => null,
}));

// Must be a real constructor so `new IntersectionObserver(...)` works under Vitest v4.
window.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
  this.observe = () => null;
  this.unobserve = () => null;
  this.disconnect = () => null;
}) as unknown as typeof IntersectionObserver;

const BUILDING = {
  id: "b1",
  name: "Test Building",
  city: null,
  status: null,
  architect_statement: null,
} as unknown as BuildingDetails;

const TEXT_ONLY_BLOCK: StreamBlock = {
  key: "e1",
  entryId: "e1",
  user: { username: "annalaurent", avatar_url: null },
  content: "A quiet masterpiece of proportion.",
  rating: null,
  status: "visited",
  images: [],
  isOfficial: false,
  topLikes: 0,
  blockType: "text-only",
  score: 20,
};

function renderTab({
  streamBlocks = [] as StreamBlock[],
  onAddNote = vi.fn(),
} = {}) {
  render(
    <MemoryRouter>
      <BuildingOverviewTab
        building={BUILDING}
        buildingCredits={[]}
        primaryCredit={null}
        locality={null}
        streamBlocks={streamBlocks}
        isStatusBuilding={false}
        hasMoreCommunity={false}
        loadMoreCommunity={vi.fn()}
        onSelectImage={vi.fn()}
        onAddNote={onAddNote}
      />
    </MemoryRouter>,
  );
  return { onAddNote };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BuildingOverviewTab — community empty state", () => {
  it("names what the section actually holds: notes and photos, not photos alone", () => {
    renderTab();

    expect(screen.getByText("No notes or photos yet")).toBeTruthy();
    // The stream is notes/reviews + photos, so a photos-only headline is wrong.
    expect(screen.queryByText("No photos yet")).toBeNull();
    expect(
      screen.getByText("Add a note or a photo to start this building's record."),
    ).toBeTruthy();
  });

  it("offers one action that covers both kinds of contribution", () => {
    const { onAddNote } = renderTab();

    const action = screen.getByRole("button", { name: "Add note or photo" });
    fireEvent.click(action);

    expect(onAddNote).toHaveBeenCalledTimes(1);
  });

  it("shows the community stream instead of the empty state once an entry exists", () => {
    renderTab({ streamBlocks: [TEXT_ONLY_BLOCK] });

    expect(screen.queryByText("No notes or photos yet")).toBeNull();
    expect(screen.getByText("Community")).toBeTruthy();
    // A text-only note counts as an entry — the header must agree with the empty
    // state about what populates this section.
    expect(screen.getByText("1 entry")).toBeTruthy();
    expect(screen.getByText("A quiet masterpiece of proportion.")).toBeTruthy();
  });
});
