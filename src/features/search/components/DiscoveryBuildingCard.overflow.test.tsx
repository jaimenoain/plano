// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DiscoveryBuildingCard } from './DiscoveryBuildingCard';
import { DiscoveryBuilding } from './types';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('@/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: () => ({
    statuses: { '123': 'visited' },
    ratings: { '123': 5 },
  }),
}));

vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (url: string | null) => url,
}));

vi.mock('@/utils/url', () => ({
  getBuildingUrl: (id: string, slug?: string | null) => `/building/${slug || id}`,
}));

describe('DiscoveryBuildingCard Overflow', () => {
  afterEach(() => {
    cleanup();
  });

  const mockBuilding: DiscoveryBuilding = {
    id: '123',
    name: 'A very very very very very very very very very very long building name that should be truncated',
    slug: 'test-building',
    main_image_url: 'test-image.jpg',
    architects: [{ id: 'arch1', name: 'A very very very very very very long architect name' }],
    year_completed: 2020,
    city: 'A very very very very long city name',
    country: 'A very very very very long country name',
    location_lat: 0,
    location_lng: 0,
    status: 'Demolished'
  };

  it('applies min-w-0 to the content container', () => {
    const { container } = render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    // Find the flex-col flex-1 container that holds the content
    // We look for the div that contains the building name
    const buildingName = screen.getByText(/very long building name/i);
    const contentContainer = buildingName.closest('.flex-col.flex-1');

    expect(contentContainer).not.toBeNull();
    expect(contentContainer?.className).toContain('min-w-0');
  });

  it('applies min-w-0 to the Card container', () => {
    const { container } = render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    // The Card is the outer container inside the Link
    const link = container.querySelector('a');
    const card = link?.firstElementChild;

    expect(card).not.toBeNull();
    expect(card?.className).toContain('min-w-0');
  });

  it('applies max-w-full and truncate to badges', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    // 'visited' badge comes from the mock statuses
    // The text 'Visited' is inside the Badge div
    const visitedText = screen.getByText('Visited');
    // The Badge is likely the parent or the element itself if it was just text, but here it has children (icon circle)
    // The Badge component renders a div.
    // Let's find the closest div with badge classes or just parent.
    const visitedBadge = visitedText.closest('div[class*="rounded-full"]'); // Badge has rounded-full by default

    expect(visitedBadge).not.toBeNull();
    expect(visitedBadge?.className).toContain('max-w-full');
    expect(visitedBadge?.className).toContain('truncate');

    // 'Demolished' badge comes from building status
    const statusText = screen.getByText('Demolished');
    const statusBadge = statusText.closest('div[class*="rounded-full"]');

    expect(statusBadge).not.toBeNull();
    expect(statusBadge?.className).toContain('max-w-full');
    expect(statusBadge?.className).toContain('truncate');
  });
});
