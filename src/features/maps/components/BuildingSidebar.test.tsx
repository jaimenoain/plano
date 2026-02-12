// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { BuildingSidebar } from './BuildingSidebar';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { keepPreviousData } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../providers/MapContext', () => ({
  useMapContext: () => ({
    state: { bounds: { south: 0, west: 0, north: 10, east: 10 }, filters: {} },
    methods: { setHighlightedId: vi.fn() },
  }),
}));

const { useInfiniteQuerySpy } = vi.hoisted(() => {
  return { useInfiniteQuerySpy: vi.fn() };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useInfiniteQuery: (options: any) => {
      useInfiniteQuerySpy(options);
      return {
        data: {
          pages: [
            [
              {
                id: '1',
                name: 'Test Building',
                slug: 'test-building',
                image_url: 'test.jpg',
                rating: 5,
                status: 'visited',
                lat: 0,
                lng: 0,
                architects: ['Zaha Hadid', 'Patrik Schumacher'],
                year_completed: 2020,
                city: 'London',
                country: 'UK',
              },
            ],
          ],
        },
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        isError: false,
      };
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock utils
vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (url: string) => url,
}));

describe('BuildingSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders building information including architects, year, and location', () => {
    render(
      <MemoryRouter>
        <BuildingSidebar />
      </MemoryRouter>
    );

    // Check Name
    expect(screen.getByText('Test Building')).toBeDefined();

    // Check Architects
    expect(screen.getByText('Zaha Hadid, Patrik Schumacher')).toBeDefined();

    // Check Location and Year
    expect(screen.getByText('London • UK • 2020')).toBeDefined();

    // Check Status
    expect(screen.getByText('visited')).toBeDefined();
  });

  it('uses keepPreviousData for smoother transitions', () => {
    render(
      <MemoryRouter>
        <BuildingSidebar />
      </MemoryRouter>
    );

    expect(useInfiniteQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholderData: keepPreviousData,
      })
    );
  });
});
