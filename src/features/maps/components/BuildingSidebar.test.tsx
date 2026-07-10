// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildingSidebar } from './BuildingSidebar';
import { MemoryRouter } from 'react-router';
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
      credit_names: ['Test Designer'],
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

    // The award is rendered by RatingDots: earned-only dots, named as distinctions.
    // The old `aria-label="Rating: 3"` stated a score; the award model forbids that.
    expect(screen.queryByLabelText('Rating: 3')).toBeNull();
    const ratingContainer = screen.getByLabelText('3 distinctions');
    expect(ratingContainer).toBeDefined();

    const dots = ratingContainer.querySelectorAll('span[aria-hidden]');
    expect(dots.length).toBe(3);

    // Monochrome — black dots, never lime, never a palette colour.
    expect(dots[0].className).toContain('bg-brand-primary');
    expect(dots[0].className).not.toContain('bg-yellow-400');
  });

  const renderWithBuilding = (building: Record<string, unknown>) => {
    (MapContext.useMapContext as any).mockReturnValue({
      state: { bounds: { north: 10, south: 0, east: 10, west: 0 }, filters: {} },
      methods: { setHighlightedId: vi.fn(), selectBuilding: vi.fn(), fitMapBounds: vi.fn() },
    });
    (ReactQuery.useInfiniteQuery as any).mockReturnValue({
      data: { pages: [[building]], pageParams: [1] },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    return render(
      <MemoryRouter>
        <BuildingSidebar />
      </MemoryRouter>
    );
  };

  const baseBuilding = {
    id: '1',
    name: 'Test Building',
    rating: 0,
    status: 'none',
    credit_names: [],
    image_url: null,
    slug: 'test-slug',
    lat: 0,
    lng: 0,
    year_completed: 2020,
    city: 'Test City',
    country: 'Test Country',
  };

  it('renders a construction-status chip for a Lost building', () => {
    renderWithBuilding({ ...baseBuilding, construction_status: 'Lost' });
    expect(screen.getByText('Lost')).toBeDefined();
  });

  it('renders no construction-status chip for a Built building', () => {
    renderWithBuilding({ ...baseBuilding, construction_status: 'Built' });
    expect(screen.queryByText('Built')).toBeNull();
  });
});
