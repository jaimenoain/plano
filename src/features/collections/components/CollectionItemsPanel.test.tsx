import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CollectionItemsPanel } from "./CollectionItemsPanel";

// The suggestions block owns its own search and insert; this test is about when
// the rail decides to show it at all.
vi.mock("./CollectionSearchSuggestions", () => ({
  CollectionSearchSuggestions: ({ query }: { query: string }) => (
    <div data-testid="suggestions">{query}</div>
  ),
}));

// The row is covered by its own suite; here it only needs to be countable.
vi.mock("./CollectionItemRow", () => ({
  CollectionItemRow: ({ item }: { item: { building_id: string } }) => (
    <div data-testid="item-row">{item.building_id}</div>
  ),
}));

function itemRow(id: string) {
  return {
    id: `item-${id}`,
    building_id: id,
    note: null,
    custom_category_id: null,
    is_hidden: false,
    building: { id, name: id, location_lat: 51.5, location_lng: -0.1 },
  } as unknown as React.ComponentProps<typeof CollectionItemsPanel>["items"][number];
}

afterEach(cleanup);

const baseProps = {
  collectionId: "collection-1",
  items: [],
  markers: [],
  highlightedId: null,
  setHighlightedId: vi.fn(),
  canEdit: true,
  categorizationMethod: null,
  customCategories: null,
  showImages: true,
  showAddedBy: false,
  onUpdateNote: vi.fn(),
  onUpdateCategory: vi.fn(),
  onSelect: vi.fn(),
  onRemove: vi.fn(),
  searchableCount: 24,
  isSearchActive: true,
  appliedQuery: "serpentine",
  matchCount: 0,
  onClearSearch: vi.fn(),
  excludeBuildingIds: new Set<string>(),
  outOfViewCount: 0,
} satisfies React.ComponentProps<typeof CollectionItemsPanel>;

describe("CollectionItemsPanel — search dead end", () => {
  it("follows the no-match empty state with database suggestions for an editor", () => {
    render(<CollectionItemsPanel {...baseProps} />);

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.getByTestId("suggestions")).toHaveTextContent("serpentine");
  });

  it("leaves a plain viewer with the empty state alone", () => {
    render(<CollectionItemsPanel {...baseProps} canEdit={false} />);

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });

  it("suggests nothing while the search still has matches", () => {
    render(<CollectionItemsPanel {...baseProps} matchCount={3} />);

    expect(screen.queryByText("No matches")).toBeNull();
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });

  it("keeps the suggestions up after one is added, so a second can follow", () => {
    const { rerender } = render(<CollectionItemsPanel {...baseProps} />);
    expect(screen.getByTestId("suggestions")).toBeInTheDocument();

    // The added building now matches the query — the no-match state goes, the
    // suggestions stay.
    rerender(<CollectionItemsPanel {...baseProps} matchCount={1} />);
    expect(screen.queryByText("No matches")).toBeNull();
    expect(screen.getByTestId("suggestions")).toBeInTheDocument();

    // A different query starts over.
    rerender(<CollectionItemsPanel {...baseProps} matchCount={1} appliedQuery="alvaro" />);
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });

  it("suggests nothing in an untouched collection with no query", () => {
    render(
      <CollectionItemsPanel
        {...baseProps}
        searchableCount={0}
        isSearchActive={false}
        appliedQuery=""
      />,
    );

    expect(screen.getByText("No places in this collection yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });

  // The search bar is up even before the first building lands, so a query typed
  // into an empty collection has to go somewhere better than "nothing here yet".
  it("sends a search in an empty collection straight to the suggestions", () => {
    render(<CollectionItemsPanel {...baseProps} searchableCount={0} />);

    expect(screen.queryByText("No places in this collection yet.")).toBeNull();
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.getByTestId("suggestions")).toHaveTextContent("serpentine");
  });

  it("still leaves a viewer of an empty collection with the empty state alone", () => {
    render(<CollectionItemsPanel {...baseProps} searchableCount={0} canEdit={false} />);

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByTestId("suggestions")).toBeNull();
  });
});

// Task 4.1 — the roster follows the map viewport, so the panel has to say what
// the map is leaving out. Without this the list silently shrinks as you zoom and
// reads as the collection losing rows.
describe("CollectionItemsPanel — out-of-view footer", () => {
  const browsing = { ...baseProps, isSearchActive: false, appliedQuery: "", matchCount: 0 };

  it("says nothing when the whole roster is on screen", () => {
    render(<CollectionItemsPanel {...browsing} outOfViewCount={0} />);

    expect(screen.queryByText(/outside this view/)).toBeNull();
    expect(screen.queryByText(/Zoom out/)).toBeNull();
  });

  it("counts what the viewport is hiding, with a way back", () => {
    const onZoomToCollection = vi.fn();
    render(
      <CollectionItemsPanel
        {...browsing}
        items={[itemRow("in-view")]}
        outOfViewCount={18}
        onZoomToCollection={onZoomToCollection}
      />,
    );

    expect(screen.getByText("18 more outside this view")).toBeInTheDocument();
    screen.getByRole("button", { name: /Zoom out to the whole collection/ }).click();
    expect(onZoomToCollection).toHaveBeenCalledOnce();
  });

  it("uses a proper empty state when the viewport hid everything", () => {
    render(<CollectionItemsPanel {...browsing} items={[]} outOfViewCount={7} onZoomToCollection={vi.fn()} />);

    expect(screen.getByText("Nothing in view")).toBeInTheDocument();
    expect(screen.getByText("7 places are outside this view.")).toBeInTheDocument();
    // Not the counter footer as well — one dead end, one way out of it.
    expect(screen.queryByText(/more outside this view/)).toBeNull();
  });

  it("reads singular for a single hidden place", () => {
    render(<CollectionItemsPanel {...browsing} items={[]} outOfViewCount={1} onZoomToCollection={vi.fn()} />);

    expect(screen.getByText("1 place is outside this view.")).toBeInTheDocument();
  });

  it("leaves a no-match search to say so — the query is the dead end, not the map", () => {
    render(<CollectionItemsPanel {...baseProps} items={[]} outOfViewCount={4} />);

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByText("Nothing in view")).toBeNull();
  });

  it("hides the zoom-out control when there is nothing to fit", () => {
    render(<CollectionItemsPanel {...browsing} items={[]} outOfViewCount={3} />);

    expect(screen.getByText("Nothing in view")).toBeInTheDocument();
    expect(screen.queryByText(/Zoom out/)).toBeNull();
  });
});
