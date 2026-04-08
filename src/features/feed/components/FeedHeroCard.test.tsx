// @vitest-environment happy-dom
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { FeedHeroCard } from './FeedHeroCard';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
};

const queryClient = new QueryClient();

const renderCard = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FeedHeroCard entry={mockEntry as any} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FeedHeroCard layout', () => {
  afterEach(() => {
    cleanup();
  });

  it('wraps a single hero image in a min-height muted frame', () => {
    renderCard();
    const imgElement = screen.getByAltText('Building');
    const imgContainer = imgElement.parentElement;
    expect(imgContainer?.className).toContain('min-h-[300px]');
    expect(imgContainer?.className).toContain('md:min-h-0');
    expect(imgContainer?.className).toContain('bg-surface-muted');
  });

  it('uses object-cover on the building image after load', async () => {
    renderCard();
    const imgElement = screen.getByAltText('Building') as HTMLImageElement;

    await act(async () => {
      fireEvent.load(imgElement);
    });

    expect(imgElement.className).toContain('object-cover');
    expect(imgElement.className).toContain('w-full');
    expect(imgElement.className).toContain('h-full');
  });

  it('renders FeedPhotoCarousel for multi-image entries (one slide visible, 4/5 frame)', () => {
    const mockEntryTwoImages = {
      ...mockEntry,
      id: 'test-entry-2',
      images: [
        { id: 'img1', url: 'http://example.com/img1.jpg', likes_count: 0, is_liked: false },
        { id: 'img2', url: 'http://example.com/img2.jpg', likes_count: 0, is_liked: false },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntryTwoImages as any} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const images = screen.getAllByAltText('Building') as HTMLImageElement[];
    expect(images.length).toBe(1);

    const imgContainer = images[0].parentElement;
    expect(imgContainer?.className).toContain('aspect-[4/5]');
    expect(images[0].className).toContain('object-cover');

    expect(screen.getByLabelText('Photo 1 of 2')).toBeInTheDocument();
  });
});
