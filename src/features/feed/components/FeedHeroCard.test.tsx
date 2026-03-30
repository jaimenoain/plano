// @vitest-environment happy-dom
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { FeedHeroCard } from './FeedHeroCard';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

describe('FeedHeroCard Aspect Ratio', () => {
  afterEach(() => {
    cleanup();
  });

  it('should have aspect-[4/5] placeholder initially', () => {
    renderCard();
    const imgElement = screen.getByAltText('Building');
    const imgContainer = imgElement.parentElement;
    expect(imgContainer?.className).toContain('aspect-[4/5]');
  });

  it('should use aspect-[0.8] and bg-black for tall images (9:16)', async () => {
    renderCard();
    const imgElement = screen.getByAltText('Building') as HTMLImageElement;

    // Simulate tall image load
    Object.defineProperty(imgElement, 'naturalWidth', { value: 900 });
    Object.defineProperty(imgElement, 'naturalHeight', { value: 1600 });

    await act(async () => {
      fireEvent.load(imgElement);
    });

    const imgContainer = imgElement.parentElement;
    expect(imgContainer?.className).toContain('bg-black');
    // Aspect ratio 0.8 is 4:5.
    // The style should be set. happy-dom may normalize to "0.8 / 1"
    const ar = imgContainer?.style.aspectRatio;
    expect(ar === '0.8' || ar === '0.8 / 1').toBe(true);
    expect(imgElement.className).toContain('object-contain');
  });

  it('should use natural aspect ratio for wide images (16:9)', async () => {
    renderCard();
    const imgElement = screen.getByAltText('Building') as HTMLImageElement;

    // Simulate wide image load
    Object.defineProperty(imgElement, 'naturalWidth', { value: 1600 });
    Object.defineProperty(imgElement, 'naturalHeight', { value: 900 });

    await act(async () => {
      fireEvent.load(imgElement);
    });

    const imgContainer = imgElement.parentElement;
    expect(imgContainer?.className).toContain('bg-secondary');
    // Aspect ratio 1600/900 = 1.777...
    expect(imgContainer?.style.aspectRatio).toContain('1.777');
    expect(imgElement.className).toContain('object-cover');
  });

  it('should use aspect-[0.8] and bg-black for tall images when there are 2 images', async () => {
    const mockEntryTwoImages = {
      ...mockEntry,
      id: 'test-entry-2',
      images: [
        { id: 'img1', url: 'http://example.com/img1.jpg' },
        { id: 'img2', url: 'http://example.com/img2.jpg' }
      ]
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <FeedHeroCard entry={mockEntryTwoImages as any} />
        </BrowserRouter>
      </QueryClientProvider>
    );

    const images = screen.getAllByAltText('Building') as HTMLImageElement[];
    expect(images.length).toBe(2);

    // Simulate tall image load for both images
    // Image 1: Tall (9:16)
    Object.defineProperty(images[0], 'naturalWidth', { value: 900 });
    Object.defineProperty(images[0], 'naturalHeight', { value: 1600 });
    // Image 2: Tall (9:16)
    Object.defineProperty(images[1], 'naturalWidth', { value: 900 });
    Object.defineProperty(images[1], 'naturalHeight', { value: 1600 });

    await act(async () => {
      fireEvent.load(images[0]);
      fireEvent.load(images[1]);
    });

    // Verify first image container
    const container1 = images[0].parentElement;
    expect(container1?.className).toContain('bg-black');
    const ar1 = container1?.style.aspectRatio;
    expect(ar1 === '0.8' || ar1 === '0.8 / 1').toBe(true);
    expect(images[0].className).toContain('object-contain');

    // Verify second image container
    const container2 = images[1].parentElement;
    expect(container2?.className).toContain('bg-black');
    const ar2 = container2?.style.aspectRatio;
    expect(ar2 === '0.8' || ar2 === '0.8 / 1').toBe(true);
    expect(images[1].className).toContain('object-contain');
  });
});
