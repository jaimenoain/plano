import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { CollectionMarkerCard } from "./CollectionMarkerCard";
import type { CollectionMarker } from "../types";

function makeMarker(overrides: Partial<CollectionMarker> = {}): CollectionMarker {
  return {
    id: "m-1",
    collection_id: "c-1",
    google_place_id: null,
    google_primary_type: null,
    name: "Hôtel du Nord",
    category: "accommodation",
    lat: 48.87,
    lng: 2.36,
    address: "102 Quai de Jemmapes, Paris",
    notes: null,
    website: null,
    created_at: "2026-07-30T00:00:00Z",
    created_by: "u-1",
    ...overrides,
  };
}

function renderCard({ canEdit, onRemove }: { canEdit: boolean; onRemove?: () => void }) {
  render(
    <CollectionMarkerCard
      marker={makeMarker()}
      isHighlighted={false}
      setHighlightedId={() => {}}
      canEdit={canEdit}
      onRemove={onRemove}
      onNavigate={() => {}}
    />,
  );
}

// The rail's building rows remove with a red bin (CollectionItemRow); markers
// must read as the same destructive control, not as a "done" tick.
describe("CollectionMarkerCard — remove control", () => {
  afterEach(cleanup);

  it("offers a destructive remove button matching the building rows", () => {
    renderCard({ canEdit: true, onRemove: () => {} });

    const button = screen.getByTitle("Remove from collection");
    expect(button).toHaveClass("bg-feedback-destructive");
    expect(button.querySelector("svg")).toHaveClass("lucide-trash2");
  });

  it("calls onRemove when clicked", () => {
    const onRemove = vi.fn();
    renderCard({ canEdit: true, onRemove });

    screen.getByTitle("Remove from collection").click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows no remove button to viewers who may not edit", () => {
    renderCard({ canEdit: false, onRemove: () => {} });
    expect(screen.queryByTitle("Remove from collection")).not.toBeInTheDocument();
  });
});
