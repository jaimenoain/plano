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
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
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
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
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
});
