import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MapMarkers } from './MapMarkers';
import { ClusterResponse } from '../hooks/useMapData';
import * as React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mocks
const { mockStopPropagation } = vi.hoisted(() => {
  return { mockStopPropagation: vi.fn() };
});

vi.mock('react-map-gl', () => ({
  useMap: () => ({
    current: {
      flyTo: vi.fn(),
      getZoom: () => 10,
    },
  }),
  Marker: ({ children, onClick, latitude, longitude, ...props }: any) => (
    <div
      data-testid="mock-marker"
      onClick={() => {
          if (onClick) {
            onClick({
                originalEvent: {
                    stopPropagation: mockStopPropagation,
                }
            });
          }
      }}
      data-lat={latitude}
      data-lng={longitude}
      {...props}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="mock-popup">{children}</div>,
}));

// Mock BuildingPopupContent
vi.mock('./BuildingPopupContent', () => ({
  BuildingPopupContent: () => <div data-testid="mock-popup-content">Popup Content</div>,
}));

describe('MapMarkers', () => {
  const mockClusters: ClusterResponse[] = [
    {
      id: 1,
      slug: 'test-building',
      name: 'Test Building',
      lat: 10,
      lng: 20,
      count: 1,
      is_cluster: false,
      image_url: 'test.jpg',
      rating: 5,
    },
    {
      id: 2,
      lat: 30,
      lng: 40,
      count: 5,
      is_cluster: true,
    } as any, // Cast because some props might be missing for cluster type if union type
  ];

  const setHighlightedId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders markers for clusters', () => {
    render(
      <MapMarkers
        clusters={mockClusters}
        highlightedId={null}
        setHighlightedId={setHighlightedId}
      />
    );
    const markers = screen.getAllByTestId('mock-marker');
    expect(markers).toHaveLength(2);
  });

  it('opens new tab on building marker click with correct URL and _blank target', () => {
    render(
      <MapMarkers
        clusters={mockClusters}
        highlightedId={null}
        setHighlightedId={setHighlightedId}
      />
    );

    // Find the marker for the building (is_cluster: false)
    // The first one in our mock data is the building
    const buildingMarker = screen.getAllByTestId('mock-marker')[0];

    fireEvent.click(buildingMarker);

    expect(mockStopPropagation).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('/building/test-building', '_blank');
  });

  it('handles marker click for building without slug (uses ID)', () => {
      const clustersNoSlug = [{
          ...mockClusters[0],
          slug: '', // Empty slug
          id: 999
      }];

      render(
        <MapMarkers
            clusters={clustersNoSlug}
            highlightedId={null}
            setHighlightedId={setHighlightedId}
        />
      );

      const marker = screen.getByTestId('mock-marker');
      fireEvent.click(marker);

      expect(window.open).toHaveBeenCalledWith('/building/999', '_blank');
  });
});
