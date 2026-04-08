// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { FeedHeroCard } from './FeedHeroCard';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedReview } from '@/types/feed';

// Mocks
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/features/profile/hooks/useUserBuildingStatuses', () => ({
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

describe('FeedHeroCard Overflow Protection', () => {
  afterEach(() => {
    cleanup();
  });

  it('images fill the frame with object-cover', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntry as unknown as FeedReview} />
        </BrowserRouter>
      </QueryClientProvider>
    );
    const buildingImages = screen.getAllByAltText('Building');
    buildingImages.forEach((img) => {
      expect(img.className).toContain('object-cover');
      expect(img.className).toContain('w-full');
    });
  });

  it('review excerpt uses line-clamp for overflow', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntry as unknown as FeedReview} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const [content] = screen.getAllByText('Some content here');
    expect(content.className).toContain('line-clamp-4');
    expect(content.className).toContain('max-w-md');
  });
});
