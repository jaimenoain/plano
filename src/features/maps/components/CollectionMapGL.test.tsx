// @vitest-environment happy-dom
import { render, waitFor, screen, cleanup } from '@testing-library/react';
import { CollectionMapGL } from './CollectionMapGL';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

expect.extend(matchers);

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
    cameraForBounds
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

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  useLocation: () => ({ pathname: '/collection' }),
  useNavigate: () => vi.fn(),
}));

// Mock maplibre-gl
vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(),
  },
}));

// Mock react-map-gl
vi.mock('react-map-gl', async () => {
  const React = await import('react');
  // eslint-disable-next-line react/display-name
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

// Mock ItineraryRoutes
vi.mock('./ItineraryRoutes', async () => {
  return {
    ItineraryRoutes: MockItineraryRoutes
  };
});

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
            buildings: [
                { id: '1', name: 'Building 1', location_lat: 40.7, location_lng: -74.0 }
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
      architects: [],
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
});
