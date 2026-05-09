// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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

describe('useMapData (hidden — v3)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('still filters out items with status "ignored" client-side as a safeguard', async () => {
    // v3 already excludes ub.status = 'ignored' server-side, but the hook keeps
    // a client-side safeguard for stale RPC responses.
    const mockData = [
      { id: 1, lat: 0, lng: 0, status: 'saved', tier_rank: 'Standard' },
      { id: 2, lat: 0, lng: 0, status: 'ignored', tier_rank: 'Standard' },
    ];
    rpcMock.mockResolvedValue({ data: mockData, error: null });

    const filters = {};
    const bounds = { north: 10, south: 0, east: 10, west: 0 };
    const zoom = 10;

    const { result } = renderHook(() => useMapData({ bounds, zoom, filters }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clusters).toHaveLength(1);
    expect(result.current.clusters?.[0].id).toBe(1);
  });
});
