// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { BuildingSidebar } from './BuildingSidebar';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../providers/MapContext', () => ({
  useMapContext: () => ({
    state: { bounds: { south: 0, west: 0, north: 10, east: 10 }, filters: {} },
    methods: { setHighlightedId: vi.fn() },
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
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
  }),
}));

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
});
