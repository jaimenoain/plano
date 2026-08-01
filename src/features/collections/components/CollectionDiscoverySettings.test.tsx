// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CollectionDiscoverySettings } from "./CollectionDiscoverySettings";

function renderSettings(overrides: Partial<React.ComponentProps<typeof CollectionDiscoverySettings>> = {}) {
  const onShowAllBuildingsChange = vi.fn();
  render(
    <CollectionDiscoverySettings
      showAllBuildings={false}
      onShowAllBuildingsChange={onShowAllBuildingsChange}
      {...overrides}
    />,
  );
  return { onShowAllBuildingsChange };
}

describe("CollectionDiscoverySettings", () => {
  afterEach(cleanup);

  it("hides the explainer until discovery is on", () => {
    renderSettings();

    expect(screen.getByLabelText(/Show All Buildings/i)).toBeTruthy();
    expect(screen.queryByText(/not part of this collection/i)).toBeNull();
  });

  it("explains the view once discovery is on, and points at the toggle that filters it", () => {
    renderSettings({ showAllBuildings: true });

    expect(screen.getByText(/not part of this collection/i)).toBeTruthy();
    expect(screen.getByText(/Collection \/ Discover \/ All/i)).toBeTruthy();
  });

  // Which pins you see is the rail's view toggle now, not a second switch here.
  it("no longer offers its own hide-the-collection switch", () => {
    renderSettings({ showAllBuildings: true });

    expect(screen.queryByLabelText(/Hide buildings already in this collection/i)).toBeNull();
  });

  // This is a per-viewer preference, applied on the spot — it must never wait
  // for the dialog's "Save Changes".
  it("reports a change immediately", () => {
    const { onShowAllBuildingsChange } = renderSettings();

    fireEvent.click(screen.getByLabelText(/Show All Buildings/i));

    expect(onShowAllBuildingsChange).toHaveBeenCalledWith(true);
  });
});
