// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildingSidebar } from './BuildingSidebar';
import { MemoryRouter } from 'react-router-dom';
import * as ReactQuery from '@tanstack/react-query';
import * as MapContext from '../providers/MapContext';

// Mock imports
vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query');
    return {
        ...actual,
        useInfiniteQuery: vi.fn(),
        keepPreviousData: vi.fn(),
    };
});

vi.mock('../providers/MapContext', async () => {
    return {
        useMapContext: vi.fn(),
    };
});

// Mock Supabase to prevent errors
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('BuildingSidebar Sorting', () => {
  it('sorts hidden (ignored) buildings to the bottom of the list', () => {
    // Setup mocks
    (MapContext.useMapContext as any).mockReturnValue({
      state: { bounds: { north: 10, south: 0, east: 10, west: 0 }, filters: {} },
      methods: { setHighlightedId: vi.fn() },
    });

    const mockBuildings = [
      {
        id: '1',
        name: 'Hidden Building 1',
        rating: 3,
        status: 'ignored', // Should go to bottom
        architects: [],
        image_url: null,
        slug: 'hidden-1',
        lat: 0,
        lng: 0,
      },
      {
        id: '2',
        name: 'Visible Building 1',
        rating: 3,
        status: 'saved', // Should stay at top
        architects: [],
        image_url: null,
        slug: 'visible-1',
        lat: 0,
        lng: 0,
      },
      {
        id: '3',
        name: 'Hidden Building 2',
        rating: 3,
        status: 'ignored', // Should go to bottom
        architects: [],
        image_url: null,
        slug: 'hidden-2',
        lat: 0,
        lng: 0,
      },
      {
        id: '4',
        name: 'Visible Building 2',
        rating: 3,
        status: 'visited', // Should stay at top
        architects: [],
        image_url: null,
        slug: 'visible-2',
        lat: 0,
        lng: 0,
      }
    ];

    (ReactQuery.useInfiniteQuery as any).mockReturnValue({
      data: {
        pages: [mockBuildings],
        pageParams: [1],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    render(
      <MemoryRouter>
        <BuildingSidebar />
      </MemoryRouter>
    );

    // Get all building titles
    // The titles are inside h3 tags
    const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

    // Expected order: Visible buildings first, then Hidden buildings
    // Note: The sort is stable for items in the same group, so relative order within groups should be preserved
    // Original order: Hidden 1, Visible 1, Hidden 2, Visible 2
    // Sorted order: Visible 1, Visible 2, Hidden 1, Hidden 2

    expect(titles).toHaveLength(4);
    expect(titles[0]).toBe('Visible Building 1');
    expect(titles[1]).toBe('Visible Building 2');
    expect(titles[2]).toBe('Hidden Building 1');
    expect(titles[3]).toBe('Hidden Building 2');
  });
});
