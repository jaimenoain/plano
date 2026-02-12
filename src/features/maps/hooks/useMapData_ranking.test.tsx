// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MapFilters } from '@/types/plano-map';

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

describe('useMapData Ranking Preference', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('should use "personal" ranking preference when mode is "library"', async () => {
    const filters: MapFilters = {};
    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;
    const mode = 'library';

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters, mode }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        ranking_preference: 'personal'
      })
    }));
  });

  it('should use "global" ranking preference when mode is "discover"', async () => {
    const filters: MapFilters = {};
    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;
    const mode = 'discover';

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters, mode }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        ranking_preference: 'global'
      })
    }));
  });

  it('should default to "global" ranking preference when mode is undefined', async () => {
    const filters: MapFilters = {};
    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(rpcMock).toHaveBeenCalledWith('get_map_clusters_v2', expect.objectContaining({
      filter_criteria: expect.objectContaining({
        ranking_preference: 'global'
      })
    }));
  });
});
