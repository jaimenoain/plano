import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MapMarkers } from './MapMarkers';
import { ClusterResponse } from '../hooks/useMapData';

// Mock react-map-gl
vi.mock('react-map-gl', () => ({
  useMap: () => ({
    current: {
      getZoom: () => 10,
      flyTo: vi.fn(),
    },
  }),
  Marker: ({ children, onClick }: any) => (
    <div data-testid="marker-container" onClick={onClick}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup-container">{children}</div>,
}));

// Mock BuildingPopupContent
vi.mock('./BuildingPopupContent', () => ({
  BuildingPopupContent: () => <div data-testid="popup-content">Popup Content</div>,
}));

describe('MapMarkers', () => {
  const setHighlightedId = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const buildingCluster: ClusterResponse = {
    id: 1,
    slug: 'building-1',
    name: 'Building 1',
    lat: 10,
    lng: 10,
    count: 1,
    is_cluster: false,
    image_url: null,
    rating: 0
  };

  const clusterGroup: ClusterResponse = {
    id: 2,
    lat: 20,
    lng: 20,
    count: 5,
    is_cluster: true,
  };

  it('renders a link for a single building', () => {
    render(
      <MapMarkers
        clusters={[buildingCluster]}
        setHighlightedId={setHighlightedId}
      />
    );

    const link = screen.getByRole('link', { name: /View details for Building 1/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/building/building-1');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders a div (not link) for a cluster', () => {
    render(
      <MapMarkers
        clusters={[clusterGroup]}
        setHighlightedId={setHighlightedId}
      />
    );

    const clusterMarker = screen.getByTestId('map-marker-cluster');
    expect(clusterMarker).toBeDefined();

    // Check it is NOT inside an anchor
    const link = screen.queryByRole('link');
    expect(link).toBeNull();

    // Check render content
    expect(screen.getByText('5')).toBeDefined();
  });
});
