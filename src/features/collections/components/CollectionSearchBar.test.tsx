import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionSearchBar } from "./CollectionSearchBar";

afterEach(cleanup);

const baseProps = {
  value: "",
  onValueChange: vi.fn(),
  matchCount: 24,
  totalCount: 24,
  isActive: false,
};

describe("CollectionSearchBar", () => {
  it("renders a labelled search landmark and no count until a query is active", () => {
    render(<CollectionSearchBar {...baseProps} />);

    expect(screen.getByLabelText("Search this collection")).toBeInTheDocument();
    expect(screen.queryByText(/of 24/)).toBeNull();
  });

  it("announces the match count politely while filtering", () => {
    render(<CollectionSearchBar {...baseProps} value="zaha" isActive matchCount={3} />);

    const count = screen.getByText("3 of 24 entries");
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("uses the singular for a one-entry collection", () => {
    render(
      <CollectionSearchBar
        {...baseProps}
        value="zaha"
        isActive
        matchCount={1}
        totalCount={1}
      />,
    );

    expect(screen.getByText("1 of 1 entry")).toBeInTheDocument();
  });

  it("offers Zoom to results only when the caller can locate the matches", async () => {
    const onZoomToResults = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <CollectionSearchBar {...baseProps} value="zaha" isActive matchCount={0} />,
    );
    expect(screen.queryByRole("button", { name: "Zoom to results" })).toBeNull();

    rerender(
      <CollectionSearchBar
        {...baseProps}
        value="zaha"
        isActive
        matchCount={3}
        onZoomToResults={onZoomToResults}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Zoom to results" }));

    expect(onZoomToResults).toHaveBeenCalledOnce();
  });
});
