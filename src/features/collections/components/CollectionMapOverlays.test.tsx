import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CollectionMapOverlays } from "./CollectionMapOverlays";

afterEach(cleanup);

const baseProps = {
  canEdit: true,
  searchApplies: false,
  appliedQuery: "",
  onClearSearch: vi.fn(),
  showSavedCandidates: false,
  addInViewCount: 0,
  isAddInViewDisabled: false,
  isAddingInView: false,
  onAddInView: vi.fn(),
  showAllBuildings: false,
  view: "collection" as const,
  onExitDiscovery: vi.fn(),
} satisfies React.ComponentProps<typeof CollectionMapOverlays>;

describe("CollectionMapOverlays", () => {
  it("says nothing when nothing is changing the map", () => {
    const { container } = render(<CollectionMapOverlays {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe("the search chip", () => {
    it("names the query narrowing the pins", () => {
      render(<CollectionMapOverlays {...baseProps} searchApplies appliedQuery="zaha" />);
      expect(screen.getByText(/zaha/)).toBeInTheDocument();
    });

    it("clears the search", async () => {
      const onClearSearch = vi.fn();
      render(
        <CollectionMapOverlays
          {...baseProps}
          searchApplies
          appliedQuery="zaha"
          onClearSearch={onClearSearch}
        />,
      );

      await userEvent.click(screen.getByLabelText("Clear collection search"));

      expect(onClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe("the add-in-view button", () => {
    const withCandidates = { ...baseProps, showSavedCandidates: true };

    it("counts what it would add", () => {
      render(<CollectionMapOverlays {...withCandidates} addInViewCount={3} />);
      expect(screen.getByRole("button", { name: /Add in view \(3\)/ })).toBeEnabled();
    });

    it("drops the count and disables itself when there is nothing in view", () => {
      render(<CollectionMapOverlays {...withCandidates} addInViewCount={0} />);
      const button = screen.getByRole("button", { name: /Add in view/ });
      expect(button).toBeDisabled();
      expect(button).not.toHaveTextContent("(");
    });

    it("is disabled mid-add", () => {
      render(
        <CollectionMapOverlays {...withCandidates} addInViewCount={3} isAddingInView isAddInViewDisabled />,
      );
      expect(screen.getByRole("button", { name: /Adding/ })).toBeDisabled();
    });

    it("is never offered to someone who cannot edit", () => {
      render(<CollectionMapOverlays {...withCandidates} canEdit={false} addInViewCount={3} />);
      expect(screen.queryByRole("button", { name: /Add in view/ })).not.toBeInTheDocument();
    });
  });

  describe("the discovery chip", () => {
    it("says the map is showing the whole catalogue", () => {
      render(<CollectionMapOverlays {...baseProps} showAllBuildings view="all" />);
      expect(screen.getByText("Discovery view")).toBeInTheDocument();
    });

    it("says so differently once the collection's own pins are hidden", () => {
      render(<CollectionMapOverlays {...baseProps} showAllBuildings view="discover" />);
      expect(screen.getByText("Discovery · collection hidden")).toBeInTheDocument();
    });

    it("says the layer is merely available while the view is the collection alone", () => {
      render(<CollectionMapOverlays {...baseProps} showAllBuildings view="collection" />);
      expect(screen.getByText("Discovery available")).toBeInTheDocument();
    });

    it("is one tap out of discovery", async () => {
      const onExitDiscovery = vi.fn();
      render(
        <CollectionMapOverlays {...baseProps} showAllBuildings onExitDiscovery={onExitDiscovery} />,
      );

      await userEvent.click(screen.getByLabelText("Turn off discovery view"));

      expect(onExitDiscovery).toHaveBeenCalledTimes(1);
    });

    it("is never offered to someone who cannot edit", () => {
      render(<CollectionMapOverlays {...baseProps} showAllBuildings canEdit={false} />);
      expect(screen.queryByText("Discovery view")).not.toBeInTheDocument();
    });
  });
});
