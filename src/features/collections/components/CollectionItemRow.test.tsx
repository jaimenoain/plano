import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import type { ReactNode } from "react";
import { CollectionItemRow } from "./CollectionItemRow";
import type { CollectionItemWithBuilding } from "../types";

// BuildingListRow is the shared editorial row (its own click behaviour is
// covered in BuildingListRow.test.tsx); here we care that the footerSlot — where
// the "Added by" attribution lives — is rendered, and that the row's onSelect is
// actually forwarded rather than dropped on the way down.
vi.mock("@/features/maps", () => ({
  BuildingListRow: ({
    name,
    footerSlot,
    onSelect,
  }: {
    name: string;
    footerSlot: ReactNode;
    onSelect?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onSelect}>
        {name}
      </button>
      <div>{footerSlot}</div>
    </div>
  ),
}));

vi.mock("@/features/credits/api/credits", () => ({
  primaryBuildingCreditsToSummaries: () => [],
}));

function makeItem(overrides: Partial<CollectionItemWithBuilding> = {}): CollectionItemWithBuilding {
  return {
    id: "item-1",
    building_id: "b-1",
    note: null,
    custom_category_id: null,
    is_hidden: false,
    added_by: null,
    added_by_user: null,
    building: {
      id: "b-1",
      name: "Villa Savoye",
      location_lat: 0,
      location_lng: 0,
      city: "Poissy",
      country: "France",
      slug: "villa-savoye",
      short_id: 1,
      year_completed: 1931,
      hero_image_url: null,
      community_preview_url: null,
      location_precision: "exact",
      building_credits: [],
    },
    ...overrides,
  };
}

function renderRow(
  item: CollectionItemWithBuilding,
  showAddedBy: boolean,
  onSelect: () => void = () => {},
  topRating?: { username: string; rating: number },
) {
  render(
    <CollectionItemRow
      item={item}
      isHighlighted={false}
      setHighlightedId={() => {}}
      canEdit={false}
      onUpdateNote={() => {}}
      onSelect={onSelect}
      showAddedBy={showAddedBy}
      topRating={topRating}
    />,
  );
}

describe("CollectionItemRow — added-by attribution", () => {
  afterEach(cleanup);

  it("shows 'Added by @username' when enabled and the adder is known", () => {
    renderRow(makeItem({ added_by: "u-1", added_by_user: { id: "u-1", username: "corbusier" } }), true);
    expect(screen.getByText(/Added by @corbusier/)).toBeInTheDocument();
  });

  it("shows no attribution when the setting is off", () => {
    renderRow(makeItem({ added_by: "u-1", added_by_user: { id: "u-1", username: "corbusier" } }), false);
    expect(screen.queryByText(/Added by/)).not.toBeInTheDocument();
  });

  it("shows no attribution for pre-attribution rows (unknown adder)", () => {
    renderRow(makeItem({ added_by: null, added_by_user: null }), true);
    expect(screen.queryByText(/Added by/)).not.toBeInTheDocument();
  });

  it("forwards the row's select handler, so a click can open the drawer", () => {
    const onSelect = vi.fn();
    renderRow(makeItem(), false, onSelect);

    fireEvent.click(screen.getByRole("button", { name: "Villa Savoye" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("CollectionItemRow — top rating", () => {
  afterEach(cleanup);

  it("shows the rater's name and award tier when a top rating is supplied", () => {
    renderRow(makeItem(), false, () => {}, { username: "jaimenoain", rating: 3 });
    expect(screen.getByText(/jaimenoain: Masterpiece/)).toBeInTheDocument();
  });

  it("shows nothing when no top rating is supplied", () => {
    renderRow(makeItem(), false);
    expect(screen.queryByText(/Masterpiece|Essential|Impressive|Interesting/)).not.toBeInTheDocument();
  });

  it("coexists with the 'Added by' line", () => {
    renderRow(
      makeItem({ added_by: "u-1", added_by_user: { id: "u-1", username: "corbusier" } }),
      true,
      () => {},
      { username: "jaimenoain", rating: 2 },
    );
    expect(screen.getByText(/Added by @corbusier/)).toBeInTheDocument();
    expect(screen.getByText(/jaimenoain: Essential/)).toBeInTheDocument();
  });
});
