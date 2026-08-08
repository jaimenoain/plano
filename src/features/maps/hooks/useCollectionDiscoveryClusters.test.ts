// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClusterResponse } from './useMapData';
import { useCollectionDiscoveryClusters } from './useCollectionDiscoveryClusters';

const { mockUseMapData } = vi.hoisted(() => ({ mockUseMapData: vi.fn() }));

vi.mock('./useMapData', () => ({ useMapData: mockUseMapData }));

const VIEWPORT = {
  bounds: { north: 10, south: 0, east: 10, west: 0 },
  zoom: 12,
};

function cluster(overrides: Partial<ClusterResponse>): ClusterResponse {
  return {
    id: 'b1',
    lat: 1,
    lng: 1,
    is_cluster: false,
    count: 1,
    rating: null,
    status: null,
    ...overrides,
  } as ClusterResponse;
}

describe('useCollectionDiscoveryClusters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMapData.mockReturnValue({ clusters: [], isLoading: false, isFetching: false, error: null });
  });

  it('passes zero bounds when disabled, so useMapData skips the RPC entirely', () => {
    renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: false,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set<string>(),
      }),
    );

    expect(mockUseMapData).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: { north: 0, south: 0, east: 0, west: 0 }, zoom: 0 }),
    );
  });

  it('waits for a real viewport before fetching', () => {
    renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: true,
        viewport: null,
        collectionBuildingIds: new Set<string>(),
      }),
    );

    expect(mockUseMapData).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: { north: 0, south: 0, east: 0, west: 0 } }),
    );
  });

  it('queries the live viewport, unfiltered and in discover mode, when enabled', () => {
    renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: true,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set<string>(),
      }),
    );

    expect(mockUseMapData).toHaveBeenCalledWith({
      bounds: VIEWPORT.bounds,
      zoom: VIEWPORT.zoom,
      filters: {},
      mode: 'discover',
    });
  });

  it('drops pins the collection already holds and tags the rest as discovery', () => {
    mockUseMapData.mockReturnValue({
      clusters: [cluster({ id: 'in-collection' }), cluster({ id: 'new-one' })],
      isLoading: false,
      isFetching: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: true,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set(['in-collection']),
      }),
    );

    expect(result.current).toEqual([
      expect.objectContaining({ id: 'new-one', is_discovery: true }),
    ]);
  });

  // A cluster bubble is an opaque server-side count — there is no id list to
  // filter against, so it survives even when it covers collected buildings.
  it('keeps cluster bubbles regardless of collection membership', () => {
    mockUseMapData.mockReturnValue({
      clusters: [cluster({ id: 'in-collection', is_cluster: true, count: 12 })],
      isLoading: false,
      isFetching: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: true,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set(['in-collection']),
      }),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].is_discovery).toBe(true);
  });

  // useMapData keeps previous data across key changes; without the guard, stale
  // discovery pins would linger on the map after the toggle went off.
  it('returns nothing when disabled even if the query still holds data', () => {
    mockUseMapData.mockReturnValue({
      clusters: [cluster({ id: 'stale' })],
      isLoading: false,
      isFetching: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: false,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set<string>(),
      }),
    );

    expect(result.current).toEqual([]);
  });

  // Task 5.7 — quality-tier / era / standard filters passed by the caller.
  it('forwards caller-supplied filters to useMapData instead of the empty default', () => {
    const filters = { minTierRank: 'Top 5%' as const, centuries: [19] };
    renderHook(() =>
      useCollectionDiscoveryClusters({
        enabled: true,
        viewport: VIEWPORT,
        collectionBuildingIds: new Set<string>(),
        filters,
      }),
    );

    expect(mockUseMapData).toHaveBeenCalledWith({
      bounds: VIEWPORT.bounds,
      zoom: VIEWPORT.zoom,
      filters,
      mode: 'discover',
    });
  });

  // The pan-churn regression this hook's own comment warns about: identical
  // filters across renders must not re-key useMapData's query.
  it('does not change the filters object identity across re-renders when the caller passes a stable object', () => {
    const filters = { minTierRank: 'Top 1%' as const };
    const { rerender } = renderHook(
      (props: { filters: typeof filters }) =>
        useCollectionDiscoveryClusters({
          enabled: true,
          viewport: VIEWPORT,
          collectionBuildingIds: new Set<string>(),
          filters: props.filters,
        }),
      { initialProps: { filters } },
    );

    rerender({ filters });

    const calls = mockUseMapData.mock.calls;
    expect(calls[0][0].filters).toBe(calls[calls.length - 1][0].filters);
  });
});
