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

describe('useMapData (hidden)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('should enforce hide_hidden: true regardless of input filter', async () => {
    // Case 1: hideHidden is false in filters (e.g. user tries to show hidden)
    const filters = {
      hideHidden: false
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        hide_hidden: true
      })
    }));
  });

  it('should enforce hide_hidden: true even if input filter is true', async () => {
    // Case 2: hideHidden is true in filters (default behavior)
    const filters = {
      hideHidden: true
    };

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        hide_hidden: true
      })
    }));
  });

  it('should enforce hide_hidden: true even if input filter is undefined', async () => {
    // Case 3: hideHidden is undefined in filters
    const filters = {};

    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify RPC call args
    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        hide_hidden: true
      })
    }));
  });
});
