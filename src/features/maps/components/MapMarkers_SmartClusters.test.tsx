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

  it('renders Tier 3 (Lime) cluster correctly', () => {
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
    // Check classes for Lime styling
    expect(pin.className).toContain('bg-[#F6FFA0]/90');
    expect(pin.className).toContain('border-lime-high');
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
    // Check classes for White styling
    expect(pin.className).toContain('bg-white/90');
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
    // Check classes for Standard styling
    expect(pin.className).toContain('bg-[#f5f5f5]');
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
    // Should fallback to standard
    expect(pin.className).toContain('bg-[#f5f5f5]');
    expect(pin.className).toContain('border-gray-600');
    // Check zIndex
    const marker = screen.getByTestId('marker-container');
    expect(marker.style.zIndex).toBe('10');
  });
});
