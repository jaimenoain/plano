import { render, screen, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import type { ReactNode } from "react";
import { CollectionItemRow } from "./CollectionItemRow";
import type { CollectionItemWithBuilding } from "../types";

// BuildingListRow is the shared editorial row; here we only care that the
// footerSlot (where the "Added by" attribution lives) is rendered.
vi.mock("@/features/maps", () => ({
  BuildingListRow: ({ name, footerSlot }: { name: string; footerSlot: ReactNode }) => (
    <div>
      <span>{name}</span>
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

function renderRow(item: CollectionItemWithBuilding, showAddedBy: boolean) {
  render(
    <CollectionItemRow
      item={item}
      isHighlighted={false}
      setHighlightedId={() => {}}
      canEdit={false}
      onUpdateNote={() => {}}
      onSelect={() => {}}
      showAddedBy={showAddedBy}
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
});
