// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionRailViewToggle } from "./CollectionRailViewToggle";

afterEach(cleanup);

const baseProps = {
  view: "collection" as const,
  onViewChange: vi.fn(),
  showViewToggle: true,
  hasItinerary: false,
  itineraryView: false,
  onItineraryViewChange: vi.fn(),
} satisfies React.ComponentProps<typeof CollectionRailViewToggle>;

describe("the view segments", () => {
  it("offers the collection, what isn't in it, and both", () => {
    render(<CollectionRailViewToggle {...baseProps} />);

    expect(screen.getByRole("button", { name: "Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discover" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
  });

  // The page hides the segments when neither Show Saved Places nor Show All
  // Buildings is on: three ways to see one thing is not a choice.
  it("draws no segments when there is no second layer to choose", () => {
    render(<CollectionRailViewToggle {...baseProps} showViewToggle={false} />);

    expect(screen.queryByRole("button", { name: "Discover" })).not.toBeInTheDocument();
  });

  it("reports the picked view", async () => {
    const onViewChange = vi.fn();
    render(<CollectionRailViewToggle {...baseProps} onViewChange={onViewChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Discover" }));

    expect(onViewChange).toHaveBeenCalledWith("discover");
  });
});

describe("the itinerary chip", () => {
  const withItinerary = { ...baseProps, hasItinerary: true };

  it("is absent until a route has been generated", () => {
    render(<CollectionRailViewToggle {...baseProps} />);

    expect(screen.queryByRole("button", { name: "Itinerary" })).not.toBeInTheDocument();
  });

  it("rides under the segments on any view holding the collection", () => {
    const { rerender } = render(<CollectionRailViewToggle {...withItinerary} />);
    expect(screen.getByRole("button", { name: "Itinerary" })).toBeInTheDocument();

    rerender(<CollectionRailViewToggle {...withItinerary} view="all" />);
    expect(screen.getByRole("button", { name: "Itinerary" })).toBeInTheDocument();
  });

  // Discover is the view minus the collection — there is no roster to lay out.
  it("is absent on Discover", () => {
    render(<CollectionRailViewToggle {...withItinerary} view="discover" />);

    expect(screen.queryByRole("button", { name: "Itinerary" })).not.toBeInTheDocument();
  });

  it("survives without the segments, so a route is reachable with no discovery on", () => {
    render(<CollectionRailViewToggle {...withItinerary} showViewToggle={false} />);

    expect(screen.getByRole("button", { name: "Itinerary" })).toBeInTheDocument();
  });

  it("carries its own pressed state and toggles it", async () => {
    const onItineraryViewChange = vi.fn();
    const { rerender } = render(
      <CollectionRailViewToggle {...withItinerary} onItineraryViewChange={onItineraryViewChange} />,
    );

    const chip = screen.getByRole("button", { name: "Itinerary" });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(chip);
    expect(onItineraryViewChange).toHaveBeenCalledWith(true);

    rerender(
      <CollectionRailViewToggle
        {...withItinerary}
        itineraryView
        onItineraryViewChange={onItineraryViewChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Itinerary" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
