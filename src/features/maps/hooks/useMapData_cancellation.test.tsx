// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MapFilters } from '@/types/plano-map';

const { rpcMock, signals } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  signals: [] as AbortSignal[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock },
}));

const bounds = { north: 10, south: 0, east: 10, west: 0 };
const zoom = 10;

/**
 * Builder stub that records the signal handed to `.abortSignal()` and resolves
 * only once the test releases it — so a request can be observed mid-flight.
 */
function makeBuilder(release: Promise<{ data: unknown; error: unknown }>) {
  return {
    abortSignal: (signal: AbortSignal) => {
      signals.push(signal);
      return release;
    },
  };
}

describe('useMapData — cancellation is owned by React Query', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    signals.length = 0;
  });

  // Regression: the hook used to keep ONE hand-rolled AbortController shared by
  // every query it ever ran, aborting `abortRef.current` at the top of each
  // queryFn. A retry of an already-aborted stale query therefore killed the
  // *live* request; that query landed in `error`, and `keepPreviousData` kept
  // the stale pins on screen — on /map, the whole catalogue, while the SERP
  // list showed the correct (library-filtered) rows.
  it('aborts the in-flight request through the query\'s own signal, so cancelQueries reaches it', async () => {
    let resolveRpc: (v: { data: unknown; error: unknown }) => void = () => {};
    const pending = new Promise<{ data: unknown; error: unknown }>((res) => {
      resolveRpc = res;
    });
    rpcMock.mockImplementation(() => makeBuilder(pending));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const filters: MapFilters = {};
    renderHook(() => useMapData({ bounds, zoom, filters }), { wrapper });

    await waitFor(() => expect(signals.length).toBe(1));
    expect(signals[0].aborted).toBe(false);

    await queryClient.cancelQueries({ queryKey: ['map-clusters-v3'] });
    expect(signals[0].aborted).toBe(true);

    resolveRpc({ data: [], error: null });
  });

  it('does not abort a live request when an unrelated query for the same hook runs', async () => {
    rpcMock.mockImplementation(() => makeBuilder(Promise.resolve({ data: [], error: null })));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { rerender, result } = renderHook(
      ({ f }: { f: MapFilters }) => useMapData({ bounds, zoom, filters: f }),
      { wrapper, initialProps: { f: {} as MapFilters } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ f: { status: ['visited'] } as MapFilters });
    await waitFor(() => expect(signals.length).toBe(2));

    // Each query got its OWN signal; settling the second must not have been
    // collateral damage from the first.
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[1].aborted).toBe(false);
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
