// @vitest-environment happy-dom
/**
 * Roadmap Task 4.1 — the SERP list's half of the viewport↔list contract.
 *
 * The browse list must ask `get_buildings_list` for exactly the settled map
 * bounds, and must NOT send a text query: `get_map_clusters_v3` deliberately
 * ignores `filters.query`, so a list that applies it answers a different
 * question from the pins beside it. Text search belongs to Find mode
 * (`search_buildings_v2`), which supplies both panes at once.
 *
 * `useInfiniteQuery` is mocked so the query never actually runs; the test grabs
 * the `queryFn` it was handed and calls it directly, which is the only place the
 * RPC arguments exist.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import * as ReactQuery from '@tanstack/react-query';
import * as MapContext from '../providers/MapContext';
import { BuildingSidebar } from './BuildingSidebar';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return { ...actual, useInfiniteQuery: vi.fn(), keepPreviousData: vi.fn() };
});

vi.mock('../providers/MapContext', () => ({ useMapContext: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: rpcMock } }));

const bounds = { north: 51.6, south: 51.4, east: 0.1, west: -0.3 };

/** Render the sidebar and run the browse query's queryFn, returning the RPC args. */
async function captureRpcArgs(filters: Record<string, unknown>) {
  let captured: { queryFn?: (ctx: { pageParam: number }) => Promise<unknown> } = {};

  (MapContext.useMapContext as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    state: { bounds, filters },
    methods: { setHighlightedId: vi.fn(), selectBuilding: vi.fn() },
  });
  (ReactQuery.useInfiniteQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (options: typeof captured) => {
      captured = options;
      return {
        data: { pages: [[]], pageParams: [1] },
        isLoading: false,
        isFetching: false,
        isError: false,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      };
    },
  );

  render(
    <MemoryRouter>
      <BuildingSidebar />
    </MemoryRouter>,
  );

  await captured.queryFn!({ pageParam: 1 });
  return rpcMock.mock.calls.at(-1) as [string, Record<string, unknown>];
}

describe('BuildingSidebar — browse list viewport contract', () => {
  beforeEach(() => {
    rpcMock.mockClear();
  });

  it('asks get_buildings_list for the settled bounds, verbatim', async () => {
    const [fn, args] = await captureRpcArgs({});

    expect(fn).toBe('get_buildings_list');
    expect(args.min_lat).toBe(bounds.south);
    expect(args.max_lat).toBe(bounds.north);
    expect(args.min_lng).toBe(bounds.west);
    expect(args.max_lng).toBe(bounds.east);
  });

  it('never forwards the text query — the pins do not apply one either', async () => {
    const [, args] = await captureRpcArgs({ query: 'shard' });

    const criteria = args.filter_criteria as Record<string, unknown>;
    expect(criteria.query).toBeUndefined();
    // The rest of the filter set still travels, so the panes stay in parity.
    expect(criteria).toHaveProperty('exclude_construction_statuses');
  });
});
