import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MyBuildingStatusBlock } from "./MyBuildingStatusBlock";

// vitest runs without `globals: true`, so RTL's auto-cleanup never registers.
afterEach(cleanup);

const noop = () => {};

function renderBlock(props: Partial<React.ComponentProps<typeof MyBuildingStatusBlock>> = {}) {
  return render(
    <MyBuildingStatusBlock
      buildingId="b1"
      status={null}
      rating={0}
      onStatusChange={noop}
      onRate={noop}
      {...props}
    />,
  );
}

describe("MyBuildingStatusBlock", () => {
  it("names the untouched state and offers both ways in", () => {
    renderBlock();

    expect(screen.getByText("Not on your map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /visited/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /^save$/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // No mark until the building is actually on the viewer's map.
    expect(screen.queryByText("My mark")).not.toBeInTheDocument();
  });

  it("marks the active status as pressed", () => {
    const { rerender } = renderBlock({ status: "pending" });
    expect(screen.getByRole("button", { name: /saved/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    rerender(
      <MyBuildingStatusBlock
        buildingId="b1"
        status="visited"
        rating={0}
        onStatusChange={noop}
        onRate={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /visited/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the hidden state with an unhide action and no mark section", () => {
    renderBlock({ status: "ignored", rating: 3 });

    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unhide/i })).toBeInTheDocument();
    expect(screen.queryByText("My mark")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^visited$/i })).not.toBeInTheDocument();
  });

  it("surfaces the awarded tier by name once the building is tracked", () => {
    renderBlock({ status: "visited", rating: 3 });

    expect(screen.getByText("My mark")).toBeInTheDocument();
    expect(screen.getByText("Masterpiece")).toBeInTheDocument();
    expect(screen.getByText("Once in a lifetime")).toBeInTheDocument();
  });

  it("never presents the mark as a score, in any state", () => {
    for (const status of ["visited", "pending", "ignored", null] as const) {
      const { container, unmount } = renderBlock({ status, rating: 1 });
      // Awards are an honour, not "1 out of 3": no numbered choices, no scale.
      expect(container.textContent).not.toMatch(/\bout of\b|\bof 3\b|\/\s*3\b/i);
      expect(container.querySelector('[aria-label^="Rate "]')).toBeNull();
      unmount();
    }
  });

  it("reports status changes", () => {
    const onStatusChange = vi.fn();
    renderBlock({ onStatusChange });

    fireEvent.click(screen.getByRole("button", { name: /visited/i }));
    expect(onStatusChange).toHaveBeenCalledWith("visited");

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(onStatusChange).toHaveBeenCalledWith("pending");

    fireEvent.click(screen.getByRole("button", { name: /hide from my map/i }));
    expect(onStatusChange).toHaveBeenCalledWith("ignored");
  });

  it("unhide toggles the ignored status back off", () => {
    const onStatusChange = vi.fn();
    renderBlock({ status: "ignored", onStatusChange });

    fireEvent.click(screen.getByRole("button", { name: /unhide/i }));
    expect(onStatusChange).toHaveBeenCalledWith("ignored");
  });

  it("awards a tier by name through the shared picker", () => {
    const onRate = vi.fn();
    renderBlock({ status: "visited", rating: 0, onRate });

    fireEvent.click(screen.getByRole("button", { name: /edit rating/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Essential/i }));

    expect(onRate).toHaveBeenCalledWith("b1", 2);
  });

  it("reflects a new mark without a remount", () => {
    const { rerender } = renderBlock({ status: "visited", rating: 0 });
    expect(screen.getByText("Interesting")).toBeInTheDocument();

    rerender(
      <MyBuildingStatusBlock
        buildingId="b1"
        status="visited"
        rating={2}
        onStatusChange={noop}
        onRate={noop}
      />,
    );
    expect(screen.getByText("Essential")).toBeInTheDocument();
  });
});
