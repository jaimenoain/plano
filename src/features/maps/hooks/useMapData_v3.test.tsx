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

  it('defaults to ["Built","Temporary"] when neither showDemolished nor explicit constructionStatuses is set', async () => {
    const filters: MapFilters = {};
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock.mock.calls[0][1].filter_criteria.construction_statuses)
      .toEqual(['Built', 'Temporary']);
  });

  it('appends Demolished + Lost when showDemolished is true (and no explicit picks)', async () => {
    const filters: MapFilters = { showDemolished: true };
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock.mock.calls[0][1].filter_criteria.construction_statuses)
      .toEqual(['Built', 'Temporary', 'Demolished', 'Lost']);
  });

  it('explicit constructionStatuses pick overrides the showDemolished toggle', async () => {
    const filters: MapFilters = {
      constructionStatuses: ['Under Construction'],
      showDemolished: true,
    };
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock.mock.calls[0][1].filter_criteria.construction_statuses)
      .toEqual(['Under Construction']);
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
});
