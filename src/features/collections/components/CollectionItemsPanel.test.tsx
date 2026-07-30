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
