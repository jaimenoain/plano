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

// Controllable MapContext — lets tests flip the map mode (library ⇄ discover)
const { mockCtx } = vi.hoisted(() => ({
  mockCtx: { current: null as unknown },
}));
vi.mock('../providers/MapContext', () => ({
  useOptionalMapContext: () => mockCtx.current,
}));

describe('MapMarkers - Smart Clusters', () => {
  const setHighlightedId = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockCtx.current = null;
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
      // A quiet stop's own `border-border-default` must not survive alongside `border-white`:
      // Tailwind resolves that conflict by rule order, not class-attribute order.
      render(<MapMarkers clusters={[stop()]} setHighlightedId={setHighlightedId} highlightedId={null} />);

      expect(screen.getByTestId('map-pin-container').className).not.toContain('border-border-default');
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

    it('suppresses the saved mark under the sequence numeral', () => {
      render(
        <MapMarkers
          clusters={[stop({ status: 'saved' })]}
          setHighlightedId={setHighlightedId}
          highlightedId={null}
        />
      );

      expect(screen.queryByTestId('map-pin-saved-mark')).toBeNull();
    });
  });

  // Clusters mirror the 5-rank pin ladder via max_tier: a cluster wears a
  // rank's face iff it contains at least one building of that rank.
  it('renders a rank-5 cluster (solid black, inverted numeral)', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: 5 }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
    expect(pin.className).toContain('border-white');
    expect(pin.className).toContain('text-white');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('36');
  });

  it('renders a rank-4 cluster (white face, black ring)', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: 4 }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-text-primary');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('32');
  });

  it('renders a rank-3 cluster (white face, strong border)', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: 3 }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-border-strong');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('28');
  });

  it('renders a rank-2 cluster (muted face)', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: 2 }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
    expect(pin.className).toContain('border-border-strong');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('20');
  });

  it('renders a rank-1 cluster (quietest face)', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: 1 }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
    expect(pin.className).toContain('border-border-default');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('10');
  });

  it('defaults to the rank-1 style if max_tier is undefined', () => {
    render(
      <MapMarkers
        clusters={[{ ...baseCluster, max_tier: undefined }]}
        setHighlightedId={setHighlightedId}
        highlightedId={null}
      />
    );

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
    expect(pin.className).toContain('border-border-default');
    expect(screen.getByTestId('marker-container').style.zIndex).toBe('10');
  });

  describe('mode-scoped pin codes', () => {
    const building = (overrides: Partial<ClusterResponse>): ClusterResponse => ({
      ...baseCluster,
      is_cluster: false,
      count: 1,
      ...overrides,
    } as ClusterResponse);

    it('library mode: a 3-pt building renders the rank-5 face with 3 dots', () => {
      mockCtx.current = { state: { mode: 'library', filters: {} } };
      render(
        <MapMarkers
          clusters={[building({ rating: 3, status: 'visited' })]}
          setHighlightedId={setHighlightedId}
          highlightedId={null}
        />
      );

      const pin = screen.getByTestId('map-pin-container');
      expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(screen.getByTestId('map-pin-dots').children).toHaveLength(3);
    });

    it('library mode: an unsaved Top 1% building renders the quietest rank-1 face', () => {
      mockCtx.current = { state: { mode: 'library', filters: {} } };
      render(
        <MapMarkers
          clusters={[building({ tier_rank_label: 'Top 1%', rating: 0, status: 'none' })]}
          setHighlightedId={setHighlightedId}
          highlightedId={null}
        />
      );

      const pin = screen.getByTestId('map-pin-container');
      expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
      expect(screen.queryByTestId('map-pin-dots')).toBeNull();
    });

    it('discover mode: a saved building keeps its global rank and gains the saved mark', () => {
      mockCtx.current = { state: { mode: 'discover', filters: {} } };
      render(
        <MapMarkers
          clusters={[building({ tier_rank_label: 'Top 1%', rating: 1, status: 'visited' })]}
          setHighlightedId={setHighlightedId}
          highlightedId={null}
        />
      );

      const pin = screen.getByTestId('map-pin-container');
      expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(screen.getByTestId('map-pin-saved-mark')).toBeTruthy();
      expect(screen.queryByTestId('map-pin-dots')).toBeNull();
    });
  });
});
