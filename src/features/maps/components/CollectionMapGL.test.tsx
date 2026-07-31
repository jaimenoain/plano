// @vitest-environment happy-dom
import { render as rtlRender, waitFor, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollectionMapGL } from './CollectionMapGL';
import type { ClusterResponse } from '../hooks/useMapData';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

expect.extend(matchers);

// The discovery layer runs a react-query bbox query (disabled unless the viewer
// switched it on), so every render needs a client in scope.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Define hoisted mocks
const {
  mockMapRef,
  fitBoundsMock,
  cameraForBoundsMock,
  getMapMock,
  mockUpdateMapState,
  mockSetSearchParams,
  MockMapMarkers,
  MockItineraryRoutes
} = vi.hoisted(() => {
  const fitBounds = vi.fn();
  const cameraForBounds = vi.fn(() => ({
    center: { lng: -74.006, lat: 40.7128 },
    zoom: 12,
    bearing: 0,
    pitch: 0
  }));
  const getMap = vi.fn(() => ({
    cameraForBounds,
    // Read by reportViewportBounds to feed the discovery layer's bbox query.
    getZoom: () => 12,
    getBounds: () => ({
      getNorth: () => 40.8,
      getSouth: () => 40.6,
      getEast: () => -73.9,
      getWest: () => -74.1,
    }),
  }));

  const mapRef = {
    current: {
      getMap,
      fitBounds,
    }
  };

  const updateMapState = vi.fn();
  const setSearchParams = vi.fn();
  const MockMapMarkers = vi.fn();
  const MockItineraryRoutes = vi.fn();

  return {
    mockMapRef: mapRef,
    fitBoundsMock: fitBounds,
    cameraForBoundsMock: cameraForBounds,
    getMapMock: getMap,
    mockUpdateMapState: updateMapState,
    mockSetSearchParams: setSearchParams,
    MockMapMarkers,
    MockItineraryRoutes
  };
});

// Set implementations for the hoisted mocks
MockMapMarkers.mockImplementation(() => <div data-testid="map-markers">MapMarkers</div>);
MockItineraryRoutes.mockImplementation(() => <div data-testid="itinerary-routes">ItineraryRoutes</div>);

// Mock react-router
vi.mock('react-router', () => ({
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  useLocation: () => ({ pathname: '/collection' }),
  useNavigate: () => vi.fn(),
}));

// Mock maplibre-gl (CollectionMapGL calls LngLat.convert after cameraForBounds)
vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(),
    LngLat: {
      convert: (c: { lng: number; lat: number }) => ({ lat: c.lat, lng: c.lng }),
    },
  },
}));

// Mock react-map-gl/maplibre (production imports from this subpath)
vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');
  const Map = React.forwardRef((props: any, ref: any) => {
    // Simulate map load
    React.useEffect(() => {
        if (props.onLoad) {
            props.onLoad({ target: {} });
        }
    }, [props.onLoad]);

    // Assign ref
    React.useImperativeHandle(ref, () => mockMapRef.current);

    return React.createElement('div', { 'data-testid': 'map-gl-mock' }, props.children);
  });

  return {
    default: Map, // Export Map as default
    Map: Map, // Export Map as named export
    NavigationControl: () => React.createElement('div', null, 'NavigationControl'),
    GeolocateControl: () => React.createElement('div', null, 'GeolocateControl'),
    useMap: () => ({ current: mockMapRef.current }),
  };
});

// Mock getBoundsFromBuildings
vi.mock('@/utils/map', () => ({
  getBoundsFromBuildings: vi.fn(() => ({
    north: 40.8,
    south: 40.6,
    east: -73.9,
    west: -74.1
  })),
  getDistanceFromLatLonInM: vi.fn(),
}));

// Mock MapMarkers
vi.mock('./MapMarkers', async () => {
    return {
        MapMarkers: MockMapMarkers
    }
});

// Mock the detail drawer down to the one thing under test here — the collection
// action node it is handed. The real body would need Supabase, auth and images.
vi.mock('./BuildingDetailDrawer', async () => {
  const React = await import('react');
  return {
    BuildingDetailDrawer: (props: any) =>
      React.createElement('div', { 'data-testid': 'detail-drawer' }, props.collectionAction),
  };
});

// Mock ItineraryRoutes
vi.mock('./ItineraryRoutes', async () => {
  return {
    ItineraryRoutes: MockItineraryRoutes
  };
});

// Mock the discovery layer's bbox RPC — no network in unit tests, and a fixed
// payload so the merge with the collection's own pins is assertable.
vi.mock('../hooks/useMapData', () => ({
  useMapData: ({ bounds }: { bounds: { north: number } }) => ({
    // Zero bounds is how the hook expresses "discovery off"; mirror the real skip.
    clusters: bounds.north === 0 ? [] : [{ id: 'discovered-1', lat: 40.7, lng: -74, is_cluster: false, count: 1, rating: null, status: null }],
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

// Mock useStableMapUpdate
vi.mock('@/features/maps/hooks/useStableMapUpdate', () => ({
  useStableMapUpdate: () => ({
    updateMapState: mockUpdateMapState
  })
}));

// Mock useItineraryStore
vi.mock('@/features/itinerary/stores/useItineraryStore', () => ({
  useItineraryStore: (selector: any) => selector({
    days: [
        {
            dayNumber: 1,
            stops: [
                { id: 'stop1', referenceId: '1', type: 'building' },
                { id: 'custom-marker-1', referenceId: undefined, type: 'marker' }
            ]
        }
    ]
  })
}));

describe('CollectionMapGL - Viewport Fitting Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fitBoundsMock.mockClear();
    cameraForBoundsMock.mockClear();
    getMapMock.mockClear();
    mockUpdateMapState.mockClear();
    mockSetSearchParams.mockClear();
    MockMapMarkers.mockClear();
    MockItineraryRoutes.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  const mockBuildings = [
    {
      id: '1',
      name: 'Building 1',
      location_lat: 40.7,
      location_lng: -74.0,
      city: 'NY',
      country: 'USA',
      slug: 'b1',
      short_id: 1,
      year_completed: 2020,
      location_precision: 'exact',
      styles: [],
      credit_names: [],
      main_image_url: '',
    }
  ];

  it('should use cameraForBounds and update URL immediately when auto-fitting', async () => {
    // Render the component
    render(
      <CollectionMapGL
        buildings={mockBuildings}
        highlightedId={null}
        setHighlightedId={vi.fn()}
      />
    );

    // Wait for the effect to run
    await waitFor(() => {
        // Assert that cameraForBounds IS called (Desired behavior)
        expect(cameraForBoundsMock).toHaveBeenCalled();

        // Assert that fitBounds IS NOT called (Desired behavior)
        expect(fitBoundsMock).not.toHaveBeenCalled();

        // Assert that updateMapState was called immediately with the result of cameraForBounds
        expect(mockUpdateMapState).toHaveBeenCalledWith(
            expect.objectContaining({
                lat: 40.7128,
                lng: -74.006,
                zoom: 12
            }),
            true // immediate = true
        );
    });
  });

  it('should render itinerary routes when showItinerary is true', () => {
    const { getByTestId } = render(
      <CollectionMapGL
        buildings={mockBuildings}
        highlightedId={null}
        setHighlightedId={vi.fn()}
        showItinerary={true}
      />
    );
    expect(getByTestId('itinerary-routes')).toBeInTheDocument();
    expect(MockItineraryRoutes).toHaveBeenCalled();
  });

  it('should NOT render itinerary routes when showItinerary is false', () => {
    const { queryByTestId } = render(
      <CollectionMapGL
        buildings={mockBuildings}
        highlightedId={null}
        setHighlightedId={vi.fn()}
        showItinerary={false}
      />
    );
    expect(queryByTestId('itinerary-routes')).not.toBeInTheDocument();
    expect(MockItineraryRoutes).not.toHaveBeenCalled();
  });

  it('should render standard markers (undefined sequence) when showItinerary is false', () => {
     render(
        <CollectionMapGL
          buildings={mockBuildings}
          highlightedId={null}
          setHighlightedId={vi.fn()}
          showItinerary={false}
        />
     );

     expect(MockMapMarkers).toHaveBeenCalled();
     const calls = MockMapMarkers.mock.calls;
     const lastCall = calls[calls.length - 1];
     const props = lastCall[0];
     const clusters = props.clusters;

     expect(clusters).toHaveLength(1);
     expect(clusters[0].itinerary_sequence).toBeUndefined();
     expect(clusters[0].itinerary_day_index).toBeUndefined();
  });

  it('should render itinerary markers (with sequence) when showItinerary is true', () => {
     // Note: Mocked useItineraryStore returns days with building id '1'
     render(
        <CollectionMapGL
          buildings={mockBuildings}
          highlightedId={null}
          setHighlightedId={vi.fn()}
          showItinerary={true}
        />
     );

     expect(MockMapMarkers).toHaveBeenCalled();
     const calls = MockMapMarkers.mock.calls;
     const lastCall = calls[calls.length - 1];
     const props = lastCall[0];
     const clusters = props.clusters;

     expect(clusters).toHaveLength(1);
     // Since dayNumber is 1-based, index is 0.
     // Sequence is 1-based (index + 1) -> 1.
     expect(clusters[0].itinerary_sequence).toBe(1);
     expect(clusters[0].itinerary_day_index).toBe(0);
  });

  describe('discovery layer', () => {
    const renderWithDiscovery = (props: Record<string, unknown>) =>
      render(
        <CollectionMapGL
          buildings={mockBuildings}
          highlightedId={null}
          setHighlightedId={vi.fn()}
          {...props}
        />
      );

    const lastClusters = () => {
      const calls = MockMapMarkers.mock.calls;
      return calls[calls.length - 1][0].clusters;
    };

    it('draws only the collection when discovery is off', () => {
      renderWithDiscovery({ discoveryEnabled: false });

      expect(lastClusters()).toHaveLength(1);
      expect(lastClusters()[0].id).toBe('1');
    });

    // Collection pins go first: MapMarkers de-duplicates by key keeping the first
    // occurrence, so a building in both layers keeps its collection identity.
    it('appends discovery pins after the collection pins', async () => {
      renderWithDiscovery({ discoveryEnabled: true });

      await waitFor(() => expect(lastClusters()).toHaveLength(2));
      const clusters = lastClusters();
      expect(clusters[0].id).toBe('1');
      expect(clusters[0].is_discovery).toBeUndefined();
      expect(clusters[1]).toMatchObject({ id: 'discovered-1', is_discovery: true });
    });

    it('drops the collection pins when the viewer hides them', async () => {
      renderWithDiscovery({ discoveryEnabled: true, hideCollectionPins: true });

      await waitFor(() => expect(lastClusters()).toHaveLength(1));
      expect(lastClusters()[0].id).toBe('discovered-1');
    });
  });

  // The drawer's collection action follows membership, not how it was opened:
  // a building outside the collection must never offer a remove that no-ops.
  describe('drawer collection action', () => {
    const clusterFor = (id: string): ClusterResponse => ({
      id,
      lat: 40.7,
      lng: -74,
      is_cluster: false,
      count: 1,
      rating: null,
      status: null,
      construction_status: null,
    });

    const renderWithSelection = (id: string) =>
      render(
        <CollectionMapGL
          buildings={mockBuildings}
          highlightedId={null}
          setHighlightedId={vi.fn()}
          onSelectBuilding={vi.fn()}
          selectedCluster={clusterFor(id)}
          collectionBuildingIds={new Set(['1'])}
          onAddToCollection={vi.fn()}
          onRemoveFromCollection={vi.fn()}
        />
      );

    it('offers Remove for a building already in the collection', () => {
      renderWithSelection('1');

      expect(screen.getByText('Remove from collection')).toBeInTheDocument();
      expect(screen.queryByText('Add to this collection')).toBeNull();
    });

    it('offers Add for a building that is not in the collection', () => {
      renderWithSelection('discovered-1');

      expect(screen.getByText('Add to this collection')).toBeInTheDocument();
      expect(screen.queryByText('Remove from collection')).toBeNull();
    });
  });
});
