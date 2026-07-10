// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DiscoveryBuildingCard } from './DiscoveryBuildingCard';
import { DiscoveryBuilding } from './types';
import { BrowserRouter } from 'react-router';

// Mocks
vi.mock('@/features/profile/hooks/useUserBuildingStatuses', () => ({
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
    credits: [{ id: 'arch1', name: 'Test Designer' }],
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
    expect(screen.getByText('Test Designer')).toBeDefined();
  });

  it('renders the image container with correct class', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} imagePosition="right" />
      </BrowserRouter>
    );

    // Alt text now combines name + city: `[name, city].filter(Boolean).join(", ")`.
    const img = screen.getByRole('img', { name: 'Test Building, Test City' });
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

  // Kit `.serp-item` — content rows float: hairline separator only, no box, no shadow,
  // and imagery stays sharp. See design-system/.../CHECKLIST.md.
  it('renders an unboxed row with a single hairline separator', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    const row = screen.getByTestId('serp-row');
    expect(row.className).toContain('border-b');
    expect(row.className).not.toContain('shadow');
    // `border-b` alone — never a full box or a card fill.
    expect(row.className).not.toMatch(/\bborder\b(?!-)/);
    expect(row.className).not.toContain('bg-surface-card');
  });

  it('sets the building name at weight 700, never the banned 800/900', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} />
      </BrowserRouter>
    );

    const name = screen.getByText('Test Building');
    expect(name.className).toContain('font-bold');
    expect(name.className).not.toContain('font-black');
    expect(name.className).not.toContain('font-extrabold');
  });

  it('keeps the compact thumbnail sharp-edged', () => {
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={mockBuilding} variant="compact" />
      </BrowserRouter>
    );

    const img = screen.getByRole('img', { name: 'Test Building, Test City' });
    expect(img.parentElement?.className).not.toContain('rounded');
  });

  it('renders alt_name when provided and different from name', () => {
    const buildingWithAltName = { ...mockBuilding, alt_name: 'Alternative Name' };
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={buildingWithAltName} />
      </BrowserRouter>
    );

    expect(screen.getByText('Alternative Name')).toBeDefined();
  });

  it('does not render alt_name when it is the same as name', () => {
    const buildingWithSameAltName = { ...mockBuilding, alt_name: 'Test Building' };
    render(
      <BrowserRouter>
        <DiscoveryBuildingCard building={buildingWithSameAltName} />
      </BrowserRouter>
    );

    // queryByText returns null if not found
    const altNames = screen.queryAllByText('Test Building');
    // We expect only 1 occurrence (the main title), not 2
    expect(altNames.length).toBe(1);
  });
});
