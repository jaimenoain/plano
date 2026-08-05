// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SearchPage, { SearchPageShell } from "./SearchPage";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Regression: exactly ONE MapControls (→ FilterDrawer → useBuildingSearch) may
 * be mounted at a time.
 *
 * FilterDrawer owns a useBuildingSearch instance whose URL-sync effect assumes
 * it is the single canonical writer of the filter params. The desktop sidebar
 * is hidden on mobile with CSS (`hidden md:flex`), which keeps its children
 * MOUNTED — when its MapControls was rendered unconditionally, mobile had two
 * live useBuildingSearch instances, and a View-Mode toggle in the visible
 * drawer was immediately stripped back out of the URL by the hidden instance's
 * stale default state (mode=null, no status filters).
 */

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

vi.mock("@/features/maps/components/MapControls", () => ({
  MapControls: () => <div data-testid="map-controls" />,
}));

vi.mock("@/features/search/context/BuildingSearchContext", () => ({
  BuildingSearchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/search/components/MapModeToggle", () => ({
  MapModeToggle: ({ name }: { name: string }) => (
    <div data-testid="map-mode-toggle" data-name={name} />
  ),
}));

vi.mock("@/features/mymap", () => ({
  MyMapChrome: () => <div data-testid="my-map-masthead" />,
}));

const { mapState } = vi.hoisted(() => ({ mapState: { mode: null as string | null } }));

vi.mock("@/features/maps/providers/MapContext", () => ({
  MapProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMapContext: () => ({
    state: { bounds: null, filters: {}, mode: mapState.mode },
    methods: {
      setFilter: vi.fn(),
      moveMap: vi.fn(),
      fitMapBounds: vi.fn(),
      setFindModeBuildings: vi.fn(),
    },
  }),
}));

vi.mock("@/features/maps/components/PlanoMap", () => ({
  PlanoMap: () => <div data-testid="plano-map" />,
}));

vi.mock("@/features/maps/components/BuildingSidebar", () => ({
  BuildingSidebar: () => <div data-testid="building-sidebar" />,
}));

vi.mock("@/features/search/components/DiscoverySearchInput", () => ({
  DiscoverySearchInput: () => <input data-testid="discovery-search-input" />,
}));

vi.mock("@/features/search/hooks/useGlobalEntitySearch", () => ({
  useGlobalEntitySearch: () => ({ people: [], companies: [] }),
}));

vi.mock("@/features/search/hooks/useUnifiedSearch", () => ({
  useUnifiedSearch: () => ({ buildings: [], people: [], companies: [] }),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/common/ClientOnly", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/googleMapsGeocoding", () => ({
  getGeocode: vi.fn(),
  getLatLng: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  redirect: vi.fn(),
}));

describe("SearchPage — single FilterDrawer owner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapState.mode = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("mounts exactly one MapControls on desktop", () => {
    (useIsMobile as Mock).mockReturnValue(false);

    render(<SearchPage />);

    expect(screen.getAllByTestId("map-controls")).toHaveLength(1);
  });

  it("mounts exactly one MapControls on mobile (desktop sidebar copy must not mount)", () => {
    (useIsMobile as Mock).mockReturnValue(true);

    render(<SearchPage />);

    expect(screen.getAllByTestId("map-controls")).toHaveLength(1);
  });

  it("renders the mode toggle in the desktop sidebar", () => {
    (useIsMobile as Mock).mockReturnValue(false);

    render(<SearchPage />);

    const toggles = screen.getAllByTestId("map-mode-toggle");
    expect(toggles).toHaveLength(1);
    expect(toggles[0].getAttribute("data-name")).toBe("map-mode-desktop");
  });

  it("renders the mobile toggle in the floating bar (desktop copy stays CSS-hidden but shares state via the provider)", () => {
    (useIsMobile as Mock).mockReturnValue(true);

    render(<SearchPage />);

    const names = screen
      .getAllByTestId("map-mode-toggle")
      .map((el) => el.getAttribute("data-name"));
    expect(names).toContain("map-mode-mobile");
    expect(names).toContain("map-mode-desktop");
  });

  it("renders the toggle when mode=library (/map?mode=library)", () => {
    (useIsMobile as Mock).mockReturnValue(true);
    mapState.mode = "library";

    render(<SearchPageShell />);

    const toggles = screen.getAllByTestId("map-mode-toggle");
    expect(toggles.length).toBeGreaterThan(0);
  });

  it("renders the My Map masthead from library mode", () => {
    (useIsMobile as Mock).mockReturnValue(false);

    mapState.mode = "library";
    render(<SearchPage />);
    expect(screen.getByTestId("my-map-masthead")).toBeInTheDocument();

    cleanup();
    mapState.mode = null;
    render(<SearchPage />);
    expect(screen.queryByTestId("my-map-masthead")).toBeNull();
  });
});
