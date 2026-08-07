// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MapFilters } from '@/types/plano-map';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const bounds = { north: 10, south: 0, east: 10, west: 0 };
const zoom = 10;

describe('useMapData — Phase 3 (get_map_clusters_v3)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('calls get_map_clusters_v3 (not v2) and never sends a `query` text-search field', async () => {
    const filters: MapFilters = { query: 'shard' };
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v3', expect.any(Object));
    const args = rpcMock.mock.calls[0][1];
    // Find mode owns text search; v3 must not receive a `query` field.
    expect(args.filter_criteria.query).toBeUndefined();
  });

  it('uses an exclusion list (not inclusion) when neither showLost nor explicit constructionStatuses is set, so NULL-status rows pass through', async () => {
    const filters: MapFilters = {};
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fc = rpcMock.mock.calls[0][1].filter_criteria;
    expect(fc.construction_statuses).toBeUndefined();
    expect(fc.exclude_construction_statuses)
      .toEqual(['Demolished', 'Lost', 'Under Construction', 'Unbuilt']);
  });

  it('shrinks the exclusion list (drops Demolished + Lost) when showLost is true and there are no explicit picks', async () => {
    const filters: MapFilters = { showLost: true };
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fc = rpcMock.mock.calls[0][1].filter_criteria;
    expect(fc.construction_statuses).toBeUndefined();
    expect(fc.exclude_construction_statuses)
      .toEqual(['Under Construction', 'Unbuilt']);
  });

  it('explicit constructionStatuses pick uses strict inclusion and overrides the showLost toggle', async () => {
    const filters: MapFilters = {
      constructionStatuses: ['Under Construction'],
      showLost: true,
    };
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fc = rpcMock.mock.calls[0][1].filter_criteria;
    expect(fc.construction_statuses).toEqual(['Under Construction']);
    expect(fc.exclude_construction_statuses).toBeUndefined();
  });

  it('refetches when integer zoom level changes', async () => {
    const filters: MapFilters = {};
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { rerender } = renderHook(
      ({ zoom }: { zoom: number }) => useMapData({ bounds, zoom, filters }),
      { wrapper, initialProps: { zoom: 10 } }
    );

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(rpcMock.mock.calls[0][1].zoom_level).toBe(10);

    rpcMock.mockClear();
    rerender({ zoom: 11 });

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(rpcMock.mock.calls[0][1].zoom_level).toBe(11);
  });

  it('does NOT send a popularity floor (no silent popularity exclusion)', async () => {
    const filters: MapFilters = {};
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fc = rpcMock.mock.calls[0][1].filter_criteria;
    expect(fc.min_popularity_score).toBeUndefined();
    expect(fc.popularity_floor).toBeUndefined();
  });

  // Task 4.1 — the viewport↔list contract. The SERP list queries the settled
  // `map.getBounds()`; if the pins query a padded box, a cluster bubble inside
  // the viewport counts buildings the list can never show.
  it('sends the caller bounds VERBATIM — no prefetch buffer', async () => {
    const filters: MapFilters = {};
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const args = rpcMock.mock.calls[0][1];
    expect(args.min_lat).toBe(bounds.south);
    expect(args.max_lat).toBe(bounds.north);
    expect(args.min_lng).toBe(bounds.west);
    expect(args.max_lng).toBe(bounds.east);
  });

  it('still clamps a viewport that overruns the queryable globe', async () => {
    const filters: MapFilters = {};
    const overrun = { north: 92, south: -92, east: 190, west: -190 };
    const { result } = renderHook(() => useMapData({ bounds: overrun, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const args = rpcMock.mock.calls[0][1];
    expect(args.max_lat).toBe(85);
    expect(args.min_lat).toBe(-85);
    expect(args.max_lng).toBe(180);
    expect(args.min_lng).toBe(-180);
  });
});
