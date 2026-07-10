// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MapMarkers } from './MapMarkers';
import { ClusterResponse } from '../hooks/useMapData';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

// Mock react-map-gl/maplibre
vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({
    current: {
      getZoom: () => 10,
      flyTo: vi.fn(),
    },
  }),
  Marker: ({ children, style }: any) => (
    <div data-testid="marker-container" style={style}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div>{children}</div>,
}));

// Mock BuildingPopupContent
vi.mock('./BuildingPopupContent', () => ({
  BuildingPopupContent: () => <div>Popup Content</div>,
}));

describe('MapMarkers - Smart Clusters', () => {
  const setHighlightedId = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const baseCluster: ClusterResponse = {
    id: 100,
    lat: 10,
    lng: 10,
    count: 5,
    is_cluster: true,
  };

  // Kit `.pin .num`: black face, white 2px ring, white numeral. The day is carried by
  // the route's opacity, not the marker's hue — `DAY_COLORS` was eight identical limes.
  describe('itinerary stop markers', () => {
    const stop = (overrides: Partial<ClusterResponse> = {}): ClusterResponse => ({
      ...baseCluster,
      is_cluster: false,
      count: 1,
      itinerary_sequence: 2,
      itinerary_day_index: 1,
      ...overrides,
    } as ClusterResponse);

    it('paints an itinerary stop black with a white ring, never lime', () => {
      render(<MapMarkers clusters={[stop()]} setHighlightedId={setHighlightedId} highlightedId={null} />);

      const pin = screen.getByTestId('map-pin-container');
      expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(pin.className).toContain('border-white');
      expect(pin.className).toContain('text-white');
    });

    it('does not let the tier ring race the white ring', () => {
      // A Tier-C stop's own `border-gray-600` must not survive alongside `border-white`:
      // Tailwind resolves that conflict by rule order, not class-attribute order.
      render(<MapMarkers clusters={[stop()]} setHighlightedId={setHighlightedId} highlightedId={null} />);

      expect(screen.getByTestId('map-pin-container').className).not.toContain('border-gray-600');
    });

    it('keeps the construction treatment on an itinerary stop', () => {
      render(
        <MapMarkers
          clusters={[stop({ construction_status: 'Lost' })]}
          setHighlightedId={setHighlightedId}
          highlightedId={null}
        />
      );

      expect(screen.getByTestId('map-pin-container').className).toContain('opacity-50');
    });
  });

  it('renders Tier 3 (solid black, inverted numeral) cluster correctly', () => {
    const tier3Cluster: ClusterResponse = {
      ...baseCluster,
      max_tier: 3,
    };

    render(
      <MapMarkers
        clusters={[tier3Cluster]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
    expect(pin.className).toContain('border-white');
    expect(pin.className).toContain('text-white');
    // Check zIndex
    const marker = screen.getByTestId('marker-container');
    expect(marker.style.zIndex).toBe('20');
  });

  it('renders Tier 2 (White) cluster correctly', () => {
    const tier2Cluster: ClusterResponse = {
      ...baseCluster,
      max_tier: 2,
    };

    render(
      <MapMarkers
        clusters={[tier2Cluster]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-white');
    // Check zIndex
    const marker = screen.getByTestId('marker-container');
    expect(marker.style.zIndex).toBe('20');
  });

  it('renders Tier 1 (Standard) cluster correctly', () => {
    const tier1Cluster: ClusterResponse = {
      ...baseCluster,
      max_tier: 1,
    };

    render(
      <MapMarkers
        clusters={[tier1Cluster]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
    expect(pin.className).toContain('border-gray-600');
    // Check zIndex
    const marker = screen.getByTestId('marker-container');
    expect(marker.style.zIndex).toBe('10');
  });

  it('defaults to Tier 1 style if max_tier is undefined', () => {
    const defaultCluster: ClusterResponse = {
      ...baseCluster,
      max_tier: undefined,
    };

    render(
      <MapMarkers
        clusters={[defaultCluster]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
    expect(pin.className).toContain('border-gray-600');
    // Check zIndex
    const marker = screen.getByTestId('marker-container');
    expect(marker.style.zIndex).toBe('10');
  });
});
