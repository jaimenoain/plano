import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { DiscoveryBuildingCard } from './DiscoveryBuildingCard';

expect.extend(matchers);
import { BrowserRouter } from 'react-router-dom';
import * as React from 'react';

// Mocks
const mockUser = { id: 'test-user-id' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Hoist the mock function so it's available in the factory
const { mockUseUserBuildingStatuses } = vi.hoisted(() => {
  return { mockUseUserBuildingStatuses: vi.fn() };
});

vi.mock('@/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: mockUseUserBuildingStatuses,
}));

// Mock Image util
vi.mock('@/utils/image', () => ({
    getBuildingImageUrl: (url: string) => url,
}));

vi.mock('@/utils/url', () => ({
    getBuildingUrl: (id: string, slug: string, short_id: string) => `/building/${slug || id}`,
}));

describe('DiscoveryBuildingCard', () => {
    const mockBuilding = {
        id: '123',
        name: 'Test Building',
        slug: 'test-building',
        short_id: 'tb',
        main_image_url: 'test.jpg',
        city: 'Test City',
        year_completed: 2020,
        architects: [{ name: 'Test Architect' }],
        status: 'Built',
        rating: 5,
        lat: 0,
        lng: 0,
        distance: 0,
        social_context: 'Test context',
        contact_interactions: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseUserBuildingStatuses.mockReturnValue({ statuses: {}, ratings: {} });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders the image container', () => {
        render(
            <BrowserRouter>
                <DiscoveryBuildingCard building={mockBuilding} />
            </BrowserRouter>
        );
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'test.jpg');
    });

    it('has the correct layout classes (flex-row)', () => {
        render(
            <BrowserRouter>
                <DiscoveryBuildingCard building={mockBuilding} />
            </BrowserRouter>
        );
        // The card content uses flex-row. We can find the container by looking for the image parent's parent maybe?
        // Or finding the text and checking its container.
        // Let's inspect the card element itself if possible, but Card component wraps it.
        // The implementation has <div className="flex flex-row"> inside Card.
        // We can find the element containing the text and verify its parent has flex-row class.

        const title = screen.getByText('Test Building');
        // The title is inside a div, which is inside "flex flex-col flex-1...", which is inside "flex flex-row".
        // Let's traverse up.
        const contentContainer = title.closest('.flex-row');
        // Or better, search by class if possible, but testing-library discourages implementation details.
        // However, the requirement is explicitly to "verify that the class names regarding the new layout are present".

        // Let's use a query selector on the container.
        const card = screen.getByRole('link'); // It's wrapped in a Link which is a block.
        // Inside link -> Card -> div.flex-row
        // We can check if any div has "flex-row".
        const flexRowDiv = card.querySelector('.flex-row');
        expect(flexRowDiv).toBeInTheDocument();
    });

    it('renders link with target="_blank" and rel="noopener noreferrer" when target prop is passed', () => {
        render(
            <BrowserRouter>
                <DiscoveryBuildingCard building={mockBuilding} target="_blank" />
            </BrowserRouter>
        );
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('target', '_blank');
        // This assertion is expected to fail initially until the component is updated
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
