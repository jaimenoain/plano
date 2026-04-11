// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DiscoveryBuildingCard } from './DiscoveryBuildingCard';
import { DiscoveryBuilding } from './types';
import { BrowserRouter } from 'react-router';

// Mocks
vi.mock('@/features/profile/hooks/useUserBuildingStatuses', () => ({
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
    credits: [{ id: 'arch1', name: 'A very very very very very very long designer name' }],
    year_completed: 2020,
    city: 'A very very very very long city name',
    country: 'A very very very very long country name',
    location_lat: 0,
    location_lng: 0,
    status: 'Lost'
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

    // Status words removed from chip; mock has visited + 5pt rating — chip is aria-labelled only.
    const pointsBadge = screen.getByLabelText('5 points');
    expect(pointsBadge.className).toContain('max-w-full');
    expect(pointsBadge.className).toContain('truncate');

    // 'Lost' badge comes from building status
    const statusText = screen.getByText('Lost');
    const statusBadge = statusText.closest('div[class*="rounded-sm"]');

    expect(statusBadge).not.toBeNull();
    expect(statusBadge?.className).toContain('max-w-full');
    expect(statusBadge?.className).toContain('truncate');
  });

  it('renders correctly when status is Lost', () => {
    const lostBuilding = { ...mockBuilding, status: 'Lost' as any };
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={lostBuilding} />
      </BrowserRouter>
    );

    const lostText = screen.getByText('Lost');
    const lostBadge = lostText.closest('div[class*="rounded-sm"]');

    expect(lostBadge).not.toBeNull();
    expect(lostBadge?.className).toContain('max-w-full');
    expect(lostBadge?.className).toContain('truncate');
  });
});
