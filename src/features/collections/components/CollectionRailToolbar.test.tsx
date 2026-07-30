/**
 * The toolbar is the only part of the collection rail that stays put, so these
 * tests guard the two things that make that safe: the controls a reader keeps
 * using are always rendered, and the condensed name never becomes a second
 * title for a screen reader.
 *
 * Stickiness itself is not asserted — jsdom cannot compute `position: sticky`.
 * What is asserted is the state that drives it.
 */
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CollectionRailToolbar } from "./CollectionRailToolbar";

afterEach(cleanup);

const baseProps = {
  collectionName: "Brutalist Madrid",
  isStuck: false,
  actions: <button type="button">Add buildings</button>,
};

describe("CollectionRailToolbar", () => {
  it("keeps the actions and the slotted controls reachable at rest", () => {
    render(
      <CollectionRailToolbar {...baseProps}>
        <input aria-label="Search this collection" />
      </CollectionRailToolbar>,
    );

    expect(screen.getByRole("button", { name: "Add buildings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search this collection")).toBeInTheDocument();
  });

  it("hides the condensed name from the accessibility tree so the masthead heading stands alone", () => {
    render(<CollectionRailToolbar {...baseProps} isStuck />);

    // Present for sighted readers…
    const name = screen.getByText("Brutalist Madrid");
    expect(name).toBeInTheDocument();
    // …but never announced: the masthead `<h1>` is still in the DOM below.
    expect(name).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("heading", { name: "Brutalist Madrid" })).toBeNull();
  });

  it("reserves the name's row before it is stuck, so nothing shifts mid-scroll", () => {
    const { rerender } = render(<CollectionRailToolbar {...baseProps} />);

    // Rendered but invisible — a conditional render here would grow the sticky
    // box mid-scroll and jump the list.
    expect(screen.getByText("Brutalist Madrid")).toBeInTheDocument();

    rerender(<CollectionRailToolbar {...baseProps} isStuck />);
    expect(screen.getByText("Brutalist Madrid")).toBeInTheDocument();
  });
});
