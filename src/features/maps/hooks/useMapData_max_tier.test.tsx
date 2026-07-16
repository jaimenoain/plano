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

describe('useMapData (max_tier)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('should propagate max_tier from RPC response to clusters', async () => {
    // Mock RPC response with max_tier
    const mockClusters = [
      {
        id: 'cluster-5',
        lat: 5,
        lng: 5,
        is_cluster: true,
        count: 8,
        max_tier: 5, // Top rank (contains a Top 1% / 3-pt building)
      },
      {
        id: 'cluster-4',
        lat: 8,
        lng: 8,
        is_cluster: true,
        count: 6,
        max_tier: 4,
      },
      {
        id: 'cluster-1',
        lat: 10,
        lng: 10,
        is_cluster: true,
        count: 5,
        max_tier: 3,
      },
      {
        id: 'cluster-2',
        lat: 20,
        lng: 20,
        is_cluster: true,
        count: 3,
        max_tier: 2,
      },
      {
        id: 'cluster-3',
        lat: 30,
        lng: 30,
        is_cluster: true,
        count: 2,
        max_tier: 1, // Rest
      },
    ];

    rpcMock.mockResolvedValue({ data: mockClusters, error: null });

    const bounds = { north: 40, south: 0, east: 40, west: 0 };
    const zoom = 10;
    const filters = {};

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const clusters = result.current.clusters;
    expect(clusters).toHaveLength(5);

    // Verify max_tier is preserved across the full 1–5 ladder
    expect(clusters?.find(c => c.id === 'cluster-5')?.max_tier).toBe(5);
    expect(clusters?.find(c => c.id === 'cluster-4')?.max_tier).toBe(4);
    expect(clusters?.find(c => c.id === 'cluster-1')?.max_tier).toBe(3);
    expect(clusters?.find(c => c.id === 'cluster-2')?.max_tier).toBe(2);
    expect(clusters?.find(c => c.id === 'cluster-3')?.max_tier).toBe(1);
  });
});
