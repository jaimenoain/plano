// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CollectionDiscoverySettings } from "./CollectionDiscoverySettings";

function renderSettings(overrides: Partial<React.ComponentProps<typeof CollectionDiscoverySettings>> = {}) {
  const onShowAllBuildingsChange = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CollectionDiscoverySettings
        showAllBuildings={false}
        onShowAllBuildingsChange={onShowAllBuildingsChange}
        {...overrides}
      />
    </QueryClientProvider>,
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

// Task 5.7 — quality-tier and era controls for the discovery layer.
describe("CollectionDiscoverySettings — discovery filters (Task 5.7)", () => {
  afterEach(cleanup);

  it("hides the tier and era controls until discovery is on", () => {
    renderSettings({ onDiscoveryTierFilterChange: vi.fn(), onDiscoveryCenturiesChange: vi.fn() });

    expect(screen.queryByText(/Show by tier/i)).toBeNull();
    expect(screen.queryByText(/^Era$/i)).toBeNull();
  });

  it("shows the tier toggle once discovery is on, with only the selected option marked on", () => {
    renderSettings({
      showAllBuildings: true,
      discoveryTierFilter: "Top 5%",
      onDiscoveryTierFilterChange: vi.fn(),
    });

    const selected = screen.getByRole("radio", { name: "Top 5%" });
    expect(selected.getAttribute("data-state")).toBe("on");

    const unselected = screen.getByRole("radio", { name: "All" });
    expect(unselected.getAttribute("data-state")).toBe("off");
  });

  it("reports a tier change immediately", () => {
    const onDiscoveryTierFilterChange = vi.fn();
    renderSettings({
      showAllBuildings: true,
      onDiscoveryTierFilterChange,
    });

    fireEvent.click(screen.getByRole("radio", { name: "Top 1%" }));

    expect(onDiscoveryTierFilterChange).toHaveBeenCalledWith("Top 1%");
  });

  it("shows the era control once discovery is on", () => {
    renderSettings({ showAllBuildings: true, onDiscoveryCenturiesChange: vi.fn() });

    expect(screen.getByText(/^Era$/i)).toBeTruthy();
    expect(screen.getByText("20th century")).toBeTruthy();
  });

  it("keeps 'More filters' collapsed by default and expands on click", () => {
    renderSettings({ showAllBuildings: true, onDiscoveryStandardFiltersChange: vi.fn() });

    expect(screen.queryByText(/Global filters/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /More filters/i }));

    expect(screen.getByText(/Global filters/i)).toBeTruthy();
  });

  it("badges 'More filters' with the number of standard filters set", () => {
    renderSettings({
      showAllBuildings: true,
      onDiscoveryStandardFiltersChange: vi.fn(),
      discoveryStandardFilters: { category: "cat-1", showLost: true },
    });

    const button = screen.getByRole("button", { name: /More filters/i });
    expect(button.textContent).toContain("2");
  });
});
