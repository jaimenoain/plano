/**
 * The toolbar is the only part of the collection rail that stays put, so these
 * tests guard what makes that safe and what makes it worth its height: the
 * controls a reader keeps using are always rendered, they share the search
 * field's row rather than occupying a band of their own, and nothing about the
 * box changes when it sticks.
 *
 * Stickiness itself is not asserted — jsdom cannot compute `position: sticky`.
 * What is asserted is the state that drives it.
 */
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CollectionRailToolbar } from "./CollectionRailToolbar";

afterEach(cleanup);

const baseProps = {
  isStuck: false,
  actions: <button type="button">Add buildings</button>,
  search: <input aria-label="Search this collection" />,
};

/** The flex row holding the field and the actions. */
const searchRow = () => screen.getByLabelText("Search this collection").closest("div")!.parentElement!;

describe("CollectionRailToolbar", () => {
  it("keeps the actions and the search field reachable at rest", () => {
    render(<CollectionRailToolbar {...baseProps} />);

    expect(screen.getByRole("button", { name: "Add buildings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search this collection")).toBeInTheDocument();
  });

  it("sits the actions in the search field's row instead of a band of their own", () => {
    render(<CollectionRailToolbar {...baseProps} />);

    // Stacked, the actions row was empty at the scroll position every reader
    // starts at — 44px of the rail spent on nothing.
    expect(screen.getByRole("button", { name: "Add buildings" }).closest("div")!.parentElement).toBe(
      searchRow(),
    );
  });

  it("moves the actions onto the tab row when the tab cannot be searched", () => {
    render(
      <CollectionRailToolbar {...baseProps} search={undefined}>
        <div>Itinerary</div>
      </CollectionRailToolbar>,
    );

    // The itinerary hides the field; the actions join the tabs rather than open
    // a row of their own.
    expect(screen.getByText("Itinerary").parentElement!.parentElement).toBe(
      screen.getByRole("button", { name: "Add buildings" }).closest("div")!.parentElement,
    );
    expect(screen.queryByLabelText("Search this collection")).toBeNull();
  });

  it("still carries the actions with neither a field nor tabs", () => {
    render(<CollectionRailToolbar {...baseProps} search={undefined} />);

    expect(screen.getByRole("button", { name: "Add buildings" })).toBeInTheDocument();
  });

  it("changes nothing but its lift when it sticks, so the list never jumps", () => {
    const { container, rerender } = render(<CollectionRailToolbar {...baseProps} />);
    const rowAtRest = searchRow().className;
    expect(container.firstElementChild!.className).not.toContain("shadow-xs");

    rerender(<CollectionRailToolbar {...baseProps} isStuck />);

    // Same row, same height — only the shadow separating the bar from the list.
    expect(searchRow().className).toBe(rowAtRest);
    expect(container.firstElementChild!.className).toContain("shadow-xs");
  });

  it("does not repeat the collection title a screen reader has already met", () => {
    render(<CollectionRailToolbar {...baseProps} isStuck />);

    // The masthead `<h1>` stays in the DOM above; a condensed copy here was
    // `aria-hidden` decoration that cost a whole row.
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
