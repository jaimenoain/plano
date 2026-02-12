// @vitest-environment happy-dom
import { render, waitFor } from '@testing-library/react';
import { CollectionMapGL } from './CollectionMapGL';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Define hoisted mocks
const {
  mockMapRef,
  fitBoundsMock,
  cameraForBoundsMock,
  getMapMock,
  mockUpdateMapState,
  mockSetSearchParams
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

  return {
    mockMapRef: mapRef,
    fitBoundsMock: fitBounds,
    cameraForBoundsMock: cameraForBounds,
    getMapMock: getMap,
    mockUpdateMapState: updateMapState,
    mockSetSearchParams: setSearchParams
  };
});

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

    return React.createElement('div', { 'data-testid': 'map-gl-mock' }, 'MapGL Mock');
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
    const React = await import('react');
    return {
        MapMarkers: () => React.createElement('div', { 'data-testid': 'map-markers' }, 'MapMarkers')
    }
});

// Mock useStableMapUpdate
vi.mock('@/features/maps/hooks/useStableMapUpdate', () => ({
  useStableMapUpdate: () => ({
    updateMapState: mockUpdateMapState
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
});
