// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapEmptyAreaNotice } from "./MapEmptyAreaNotice";

describe("MapEmptyAreaNotice", () => {
  it("offers both ways out of an empty view", async () => {
    const onZoomOut = vi.fn();
    const onDismiss = vi.fn();
    render(<MapEmptyAreaNotice onZoomOut={onZoomOut} onDismiss={onDismiss} />);

    expect(screen.getByText("No buildings in this area")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /zoom out/i }));
    expect(onZoomOut).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
