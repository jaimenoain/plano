// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { FeedHeroCard } from './FeedHeroCard';
import { vi, describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedReview } from '@/types/feed';

// Mocks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: () => ({ statuses: {}, ratings: {} }),
}));

const mockEntry = {
  id: 'test-entry',
  type: 'hero' as const,
  building: {
    id: 'b1',
    name: 'Test Building',
    slug: 'test-building',
    short_id: 'tb',
    address: '123 Test St, City',
    main_image_url: 'http://example.com/main.jpg',
  },
  user: {
    username: 'tester',
    avatar_url: 'http://example.com/avatar.jpg',
  },
  images: [
    { id: 'img1', url: 'http://example.com/img1.jpg' }
  ],
  likes_count: 0,
  comments_count: 0,
  created_at: new Date().toISOString(),
  content: "Some content here"
};

const queryClient = new QueryClient();

describe('FeedHeroCard Overflow Protection', () => {
  it('images should have max-w-full class', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntry as unknown as FeedReview} />
        </BrowserRouter>
      </QueryClientProvider>
    );
    // Filter for building images (alt="Building")
    const buildingImages = screen.getAllByAltText('Building');
    buildingImages.forEach(img => {
      expect(img.className).toContain('max-w-full');
    });
  });

  it('text containers should have max-w-full and overflow-hidden', () => {
     render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntry as unknown as FeedReview} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    // Header text container
    // We can find it by text content and checking parent
    const username = screen.getAllByText('tester')[0];
    // username is in a span, inside div, inside div.flex-1.min-w-0
    const headerTextContainer = username.closest('.flex-col.min-w-0');
    expect(headerTextContainer?.className).toContain('max-w-full');
    expect(headerTextContainer?.className).toContain('overflow-hidden');

    // Content body container
    const content = screen.getAllByText('Some content here')[0];
    // content is in p, inside div.px-4
    const contentContainer = content.closest('div');
    expect(contentContainer?.className).toContain('max-w-full');
    expect(contentContainer?.className).toContain('overflow-hidden');
  });
});
