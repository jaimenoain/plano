// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase
const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMapData', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('should include attribute filters from materials, styles, contexts in RPC call', async () => {
    const filters = {
      materials: ['mat1', 'mat2'],
      styles: ['sty1'],
      contexts: ['ctx1'],
      attributes: ['attr1']
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    // The second argument to rpc is the params object
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v3', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        attribute_ids: expect.arrayContaining(['mat1', 'mat2', 'sty1', 'ctx1', 'attr1'])
      })
    }));
  });

  it('should handle undefined or empty attribute filters gracefully', async () => {
    const filters = {
      materials: undefined,
      styles: [],
      contexts: undefined,
      attributes: []
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    // Should pass undefined or empty array for attribute_ids, but definitely not fail
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v3', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        // In current implementation, it might be undefined or empty array.
        // We accept both, but mainly verify it doesn't crash.
      })
    }));

    // Check specific value if needed, e.g. attribute_ids should be undefined or empty array
    const callArgs = rpcMock.mock.calls[0][1];
    const attributeIds = callArgs.filter_criteria.attribute_ids;
    if (attributeIds) {
        expect(attributeIds).toHaveLength(0);
    }
  });

  it('should include personal_min_rating in RPC call', async () => {
    const filters = {
      personalMinRating: 3
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    // @ts-ignore
    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    expect(rpcMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
            filter_criteria: expect.objectContaining({
                personal_min_rating: 3
            })
        })
    );
  });

  it('should pass credit company and role filters to RPC', async () => {
    const filters = {
      creditCompany: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Acme' },
      creditRoles: ['structural_engineering', 'mep_engineering'],
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock).toHaveBeenCalledWith(
      'get_map_clusters_v3',
      expect.objectContaining({
        filter_criteria: expect.objectContaining({
          credit_company_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          credit_roles: ['structural_engineering', 'mep_engineering'],
        }),
      })
    );
  });

  it('injects mode-aware numeric tier_rank (1–5) and preserves the label', async () => {
    const rows = [
      { id: 'a', lat: 1, lng: 1, is_cluster: false, count: 1, tier_rank: 'Top 1%', rating: 0, status: 'none' },
      { id: 'b', lat: 2, lng: 2, is_cluster: false, count: 1, tier_rank: 'Top 10%', rating: 0, status: 'none' },
      { id: 'c', lat: 3, lng: 3, is_cluster: false, count: 1, tier_rank: 'Top 25%', rating: 0, status: 'none' },
      { id: 'd', lat: 4, lng: 4, is_cluster: false, count: 1, tier_rank: 'Standard', rating: 3, status: 'visited' },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const { result } = renderHook(
      () => useMapData({ bounds, zoom: 10, filters: {}, mode: 'discover' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const byId = (id: string) => result.current.clusters?.find((c) => c.id === id);
    expect(byId('a')?.tier_rank).toBe(5);
    expect(byId('b')?.tier_rank).toBe(3);
    // Retired 'Top 25%' band tolerated as the Top 20% rank
    expect(byId('c')?.tier_rank).toBe(2);
    // Discover mode ignores the personal rating
    expect(byId('d')?.tier_rank).toBe(1);
    expect(byId('a')?.tier_rank_label).toBe('Top 1%');
  });

  it('ranks by the personal code in library mode', async () => {
    const rows = [
      { id: 'a', lat: 1, lng: 1, is_cluster: false, count: 1, tier_rank: 'Standard', rating: 3, status: 'visited' },
      { id: 'b', lat: 2, lng: 2, is_cluster: false, count: 1, tier_rank: 'Standard', rating: 0, status: 'saved' },
      { id: 'c', lat: 3, lng: 3, is_cluster: false, count: 1, tier_rank: 'Top 1%', rating: 0, status: 'none' },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const { result } = renderHook(
      () => useMapData({ bounds, zoom: 10, filters: {}, mode: 'library' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const byId = (id: string) => result.current.clusters?.find((c) => c.id === id);
    expect(byId('a')?.tier_rank).toBe(5); // 3 pts
    expect(byId('b')?.tier_rank).toBe(2); // saved, unrated
    expect(byId('c')?.tier_rank).toBe(1); // unsaved — global rank ignored
  });

  it('should omit credit_company_id and credit_roles when no credit filters are set', async () => {
    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters: {} }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const filterCriteria = rpcMock.mock.calls[0][1].filter_criteria;
    expect(filterCriteria.credit_company_id).toBeUndefined();
    expect(filterCriteria.credit_roles).toBeUndefined();
  });
});
