// @vitest-environment happy-dom
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
  Marker: ({ children, onClick, style }: any) => (
    <div data-testid="marker-container" onClick={onClick} style={style}>
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

  it('renders a Top 1% marker with correct zIndex and class', () => {
    const top1Cluster: ClusterResponse = {
      ...buildingCluster,
      id: 3,
      tier_rank: 'Top 1%'
    };

    render(
      <MapMarkers
        clusters={[top1Cluster]}
        setHighlightedId={setHighlightedId}
      />
    );

    const markerContainer = screen.getByTestId('marker-container');
    expect(markerContainer.style.zIndex).toBe('100');

    const markerContent = screen.getByTestId('map-marker-building');
    expect(markerContent.className).toContain('marker-halo-gold');
  });

  it('renders a Top 5% marker with correct zIndex and class', () => {
    const top5Cluster: ClusterResponse = {
      ...buildingCluster,
      id: 4,
      tier_rank: 'Top 5%'
    };

    render(
      <MapMarkers
        clusters={[top5Cluster]}
        setHighlightedId={setHighlightedId}
      />
    );

    const markerContainer = screen.getByTestId('marker-container');
    expect(markerContainer.style.zIndex).toBe('50');

    const markerContent = screen.getByTestId('map-marker-building');
    expect(markerContent.className).toContain('marker-halo-silver');
  });

  it('renders a standard marker with default class', () => {
    render(
      <MapMarkers
        clusters={[buildingCluster]}
        setHighlightedId={setHighlightedId}
      />
    );

    const markerContent = screen.getByTestId('map-marker-building');
    expect(markerContent.className).toContain('marker-standard');
    expect(markerContent.className).not.toContain('marker-halo-gold');
    expect(markerContent.className).not.toContain('marker-halo-silver');
  });
});
