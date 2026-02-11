// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
    <div
      data-testid="marker-container"
      onClick={(e) => {
        // Mock the event structure expected by react-map-gl's Marker onClick
        // It expects an object with originalEvent
        const mockEvent = {
          originalEvent: {
            stopPropagation: vi.fn(),
          },
        };
        onClick(mockEvent);
      }}
      style={style}
    >
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
    rating: 0,
    status: undefined,
    tier_rank: 'Top 50%' // Default
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

    const clusterMarker = screen.getByTestId('map-pin-container');
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

    const markerContent = screen.getByTestId('map-pin-container');
    // Tier S: bg-lime-high
    expect(markerContent.className).toContain('bg-lime-high');
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

    const markerContent = screen.getByTestId('map-pin-container');
    // Tier A: bg-white
    expect(markerContent.className).toContain('bg-white');
  });

  it('renders a standard marker with default class', () => {
    render(
      <MapMarkers
        clusters={[buildingCluster]}
        setHighlightedId={setHighlightedId}
      />
    );

    const markerContent = screen.getByTestId('map-pin-container');
    // Tier C: bg-muted/80
    expect(markerContent.className).toContain('bg-muted/80');
    expect(markerContent.className).not.toContain('bg-lime-high');
    expect(markerContent.className).not.toContain('bg-white');
  });

  it('prevents navigation and highlights when clicking a non-highlighted marker', () => {
    // highlightedId is undefined
    render(
      <MapMarkers
        clusters={[buildingCluster]}
        highlightedId={null}
        setHighlightedId={setHighlightedId}
      />
    );

    const link = screen.getByRole('link', { name: /View details for Building 1/i });

    // Create a mock event with preventDefault
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    // We need to simulate the click with our mocked event properties
    // Note: fireEvent.click creates a synthetic event, we need to ensure preventDefault is trackable
    // or just check if setHighlightedId was called.
    // The easiest way to check preventDefault in RTL is checking if defaultPrevented is true on the event
    // BUT fireEvent.click returns true/false based on preventDefault.

    const isDefaultPrevented = !fireEvent.click(link);
    // fireEvent.click returns false if preventDefault was called.

    expect(isDefaultPrevented).toBe(true);
    expect(setHighlightedId).toHaveBeenCalledWith('1');
  });

  it('allows navigation when clicking an already highlighted marker', () => {
    // highlightedId matches the building id
    render(
      <MapMarkers
        clusters={[buildingCluster]}
        highlightedId="1"
        setHighlightedId={setHighlightedId}
      />
    );

    const link = screen.getByRole('link', { name: /View details for Building 1/i });

    const isDefaultPrevented = !fireEvent.click(link);

    expect(isDefaultPrevented).toBe(false); // Navigation allowed
    // setHighlightedId might be called again (idempotent) or not, depending on implementation detail.
    // The key requirement is that navigation is ALLOWED.
  });
});
