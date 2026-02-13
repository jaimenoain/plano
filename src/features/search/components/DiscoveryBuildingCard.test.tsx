// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DiscoveryBuildingCard } from './DiscoveryBuildingCard';
import { DiscoveryBuilding } from './types';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('@/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: () => ({
    statuses: {},
    ratings: {},
  }),
}));

vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (url: string | null) => url,
}));

vi.mock('@/utils/url', () => ({
  getBuildingUrl: (id: string, slug?: string | null) => `/building/${slug || id}`,
}));

describe('DiscoveryBuildingCard', () => {
  afterEach(() => {
    cleanup();
  });

  const mockBuilding: DiscoveryBuilding = {
    id: '123',
    name: 'Test Building',
    slug: 'test-building',
    main_image_url: 'test-image.jpg',
    architects: [{ id: 'arch1', name: 'Test Architect' }],
    year_completed: 2020,
    city: 'Test City',
    country: 'Test Country',
    location_lat: 0,
    location_lng: 0,
  };

  it('renders the building name and architect', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Building')).toBeDefined();
    expect(screen.getByText('Test Architect')).toBeDefined();
  });

  it('renders the image container with correct class', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} imagePosition="right" />
      </BrowserRouter>
    );

    const img = screen.getByRole('img', { name: 'Test Building' });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('test-image.jpg');

    // Check parent container class for layout (e.g., w-32)
    const imgContainer = img.closest('.w-32');
    expect(imgContainer).not.toBeNull();
  });

  it('renders a link with target="_blank" when prop is provided', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} target="_blank" />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/building/test-building');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('renders horizontal layout classes', () => {
     const { container } = render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    // The card content uses flex-row
    const flexRow = container.querySelector('.flex-row');
    expect(flexRow).not.toBeNull();
  });
});
