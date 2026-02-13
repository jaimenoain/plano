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

describe('BuildingSidebar', () => {
  it('renders rating dots with primary color (black/charcoal)', () => {
    // Setup mocks
    (MapContext.useMapContext as any).mockReturnValue({
      state: { bounds: { north: 10, south: 0, east: 10, west: 0 }, filters: {} },
      methods: { setHighlightedId: vi.fn() },
    });

    const mockBuilding = {
      id: '1',
      name: 'Test Building',
      rating: 3,
      status: 'saved',
      architects: ['Test Architect'],
      image_url: null,
      slug: 'test-slug',
      lat: 0,
      lng: 0,
      year_completed: 2020,
      city: 'Test City',
      country: 'Test Country',
    };

    (ReactQuery.useInfiniteQuery as any).mockReturnValue({
      data: {
        pages: [[mockBuilding]],
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

    // Check for rating dots
    // The dots are divs with specific classes inside a container with aria-label
    const ratingContainer = screen.getByLabelText('Rating: 3 stars');
    expect(ratingContainer).toBeDefined();

    // Check the dots inside
    const dots = ratingContainer.querySelectorAll('div');
    expect(dots.length).toBe(3);

    // Verify the class name contains bg-primary
    expect(dots[0].className).toContain('bg-primary');
    expect(dots[0].className).not.toContain('bg-yellow-400');
  });
});
