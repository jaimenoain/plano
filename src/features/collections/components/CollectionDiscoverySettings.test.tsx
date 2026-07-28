// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CollectionDiscoverySettings } from "./CollectionDiscoverySettings";

function renderSettings(overrides: Partial<React.ComponentProps<typeof CollectionDiscoverySettings>> = {}) {
  const onShowAllBuildingsChange = vi.fn();
  const onHideCollectionPinsChange = vi.fn();
  render(
    <CollectionDiscoverySettings
      showAllBuildings={false}
      onShowAllBuildingsChange={onShowAllBuildingsChange}
      hideCollectionPins={false}
      onHideCollectionPinsChange={onHideCollectionPinsChange}
      {...overrides}
    />,
  );
  return { onShowAllBuildingsChange, onHideCollectionPinsChange };
}

describe("CollectionDiscoverySettings", () => {
  afterEach(cleanup);

  it("hides the sub-options until discovery is on", () => {
    renderSettings();

    expect(screen.getByLabelText(/Show All Buildings/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Hide buildings already in this collection/i)).toBeNull();
  });

  it("reveals the hide-collection switch and the explainer once discovery is on", () => {
    renderSettings({ showAllBuildings: true });

    expect(screen.getByLabelText(/Hide buildings already in this collection/i)).toBeTruthy();
    expect(screen.getByText(/not part of this collection/i)).toBeTruthy();
  });

  // These are per-viewer preferences, applied on the spot — they must never wait
  // for the dialog's "Save Changes".
  it("reports a change immediately", () => {
    const { onShowAllBuildingsChange } = renderSettings();

    fireEvent.click(screen.getByLabelText(/Show All Buildings/i));

    expect(onShowAllBuildingsChange).toHaveBeenCalledWith(true);
  });

  it("reports the hide-collection change", () => {
    const { onHideCollectionPinsChange } = renderSettings({ showAllBuildings: true });

    fireEvent.click(screen.getByLabelText(/Hide buildings already in this collection/i));

    expect(onHideCollectionPinsChange).toHaveBeenCalledWith(true);
  });
});
