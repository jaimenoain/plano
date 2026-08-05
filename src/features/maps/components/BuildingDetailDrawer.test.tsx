/**
 * BuildingDetailDrawer.test.tsx
 *
 * Covers the sheet-vs-panel decision only. The desktop panel is positioned
 * inside the map container, so a caller whose map is hidden (the collection
 * page's list view below `lg`) must be able to force the portalled sheet —
 * without it the drawer opened inside `display:none` and the click read as dead.
 */
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { BuildingDetailDrawer } from "./BuildingDetailDrawer";
import type { ClusterResponse } from "../hooks/useMapData";

const { useIsMobileMock } = vi.hoisted(() => ({ useIsMobileMock: vi.fn(() => false) }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => useIsMobileMock() }));

// The body fetches the building; this suite only cares which shell wraps it.
vi.mock("./BuildingDrawerBody", () => ({
  BuildingDrawerBody: ({ layout }: { layout: string }) => (
    <div data-testid="body" data-layout={layout} />
  ),
}));

const cluster = {
  id: "building-1",
  lat: 40.4,
  lng: -3.7,
  is_cluster: false,
  count: 1,
  rating: null,
  status: null,
  construction_status: null,
  name: "Casa Mila",
} as ClusterResponse;

function renderDrawer(props: { forceSheet?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <BuildingDetailDrawer cluster={cluster} onClose={() => {}} closeOnOutsideClick {...props} />
    </MemoryRouter>,
  );
}

describe("BuildingDetailDrawer — sheet vs panel", () => {
  beforeEach(() => useIsMobileMock.mockReturnValue(false));
  afterEach(cleanup);

  it("anchors the panel inside the map on desktop", () => {
    renderDrawer();
    expect(screen.getByTestId("body").dataset.layout).toBe("panel");
  });

  it("uses the sheet on mobile", () => {
    useIsMobileMock.mockReturnValue(true);
    renderDrawer();
    expect(screen.getByTestId("body").dataset.layout).toBe("sheet");
  });

  it("uses the sheet when forced, even above the mobile breakpoint", () => {
    renderDrawer({ forceSheet: true });
    expect(screen.getByTestId("body").dataset.layout).toBe("sheet");
  });

  // The desktop outside-click handler closes on any mousedown beyond the panel,
  // which in a sheet would include the sheet's own content. It must stay off.
  it("does not close on an outside mousedown when forced to a sheet", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <BuildingDetailDrawer cluster={cluster} onClose={onClose} closeOnOutsideClick forceSheet />
      </MemoryRouter>,
    );

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
