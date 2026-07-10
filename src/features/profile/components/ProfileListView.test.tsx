// @vitest-environment happy-dom
import { createElement } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProfileListView } from './ProfileListView';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router';
import { FeedReview } from '@/types/feed';

const mocks = vi.hoisted(() => ({
  useSidebar: vi.fn(),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: mocks.useSidebar,
}));

// MichelinRatingInput and StatusBadge render motion.* elements; strip the animation props.
vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, tag: string) =>
      ({ children, whileTap, whileHover, initial, animate, exit, transition, layout, ...props }: any) =>
        createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockData: FeedReview[] = [
  {
    id: '1',
    content: 'This is a long review that should be truncated.',
    rating: 2,
    likes_count: 10,
    is_liked: false,
    comments_count: 2,
    created_at: '2023-01-01',
    status: 'visited',
    building: {
      id: 'b1',
      name: 'Test Building',
      creditedEntities: [{ id: 'p1', name: 'Designer One' }],
      year_completed: 2020,
      city: 'Test City',
      country: 'Test Country',
      main_image_url: 'http://example.com/image.jpg',
    },
    user: {
      username: 'user1',
      avatar_url: null,
      followers_count: null,
    },
    images: []
  }
];

// Mock useNavigate
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

describe('ProfileListView', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders correctly with required columns (desktop)', () => {
    mocks.useSidebar.mockReturnValue({ isMobile: false });
    const onUpdate = vi.fn();
    render(
      <TooltipProvider>
        <BrowserRouter>
          <ProfileListView
            data={mockData}
            isOwnProfile={true}
            onUpdate={onUpdate}
          />
        </BrowserRouter>
      </TooltipProvider>
    );

    // Check Headers
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Points')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('Credits')).toBeTruthy();
    expect(screen.getByText('Test Building')).toBeTruthy();

    // Check Data Content
    expect(screen.getByText('Designer One')).toBeTruthy();
    expect(screen.getByText('2020')).toBeTruthy();
    expect(screen.getByText('Test City')).toBeTruthy();
    expect(screen.getByText('Test Country')).toBeTruthy();

    const reviewsText = screen.getAllByText('Visited');
    expect(reviewsText.length).toBeGreaterThan(0);
    expect(screen.getByText('This is a long review that should be truncated.')).toBeTruthy();
  });

  it('renders stacked layout on mobile', () => {
    mocks.useSidebar.mockReturnValue({ isMobile: true });
    const onUpdate = vi.fn();
    render(
      <TooltipProvider>
        <BrowserRouter>
          <ProfileListView
            data={mockData}
            isOwnProfile={true}
            onUpdate={onUpdate}
          />
        </BrowserRouter>
      </TooltipProvider>
    );

    // Visible columns headers
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.queryByText('Photo')).toBeNull();

    // Hidden columns headers
    expect(screen.queryByText('Status')).toBeNull();
    expect(screen.queryByText('Points')).toBeNull();
    expect(screen.queryByText('Review')).toBeNull();
    expect(screen.queryByText('Credits')).toBeNull();
    expect(screen.queryByText('Year')).toBeNull();
    expect(screen.queryByText('Country')).toBeNull();

    // Stacked content
    expect(screen.getByText('Test Building')).toBeTruthy();

    // StatusBadge should be visible
    expect(screen.getByRole('button', { name: 'Visited' })).toBeTruthy();

    // Hidden column content
    expect(screen.queryByText('Designer One')).toBeNull();
    expect(screen.queryByText('Test Country')).toBeNull();
  });

  it('calls onUpdate when status is changed', () => {
      mocks.useSidebar.mockReturnValue({ isMobile: false });
      const onUpdate = vi.fn();
      render(
        <TooltipProvider>
          <BrowserRouter>
            <ProfileListView
              data={mockData}
              isOwnProfile={true}
              onUpdate={onUpdate}
            />
          </BrowserRouter>
        </TooltipProvider>
      );

      const statusButton = screen.getByRole('button', { name: 'Visited' });
      fireEvent.click(statusButton);

      expect(onUpdate).toHaveBeenCalledWith('1', { status: 'pending' });
  });

  it('calls onUpdate when rating is changed', () => {
    mocks.useSidebar.mockReturnValue({ isMobile: false });
    const onUpdate = vi.fn();
    render(
      <TooltipProvider>
        <BrowserRouter>
          <ProfileListView
            data={mockData}
            isOwnProfile={true}
            onUpdate={onUpdate}
          />
        </BrowserRouter>
      </TooltipProvider>
    );

    // InlineRating shows the earned dots; the four-tier award input lives behind them.
    fireEvent.click(screen.getByRole('button', { name: 'Set award rating' }));

    const tiers = screen.getAllByRole('radio');
    expect(tiers).toHaveLength(4);

    fireEvent.click(screen.getByRole('radio', { name: /masterpiece/i }));

    expect(onUpdate).toHaveBeenCalledWith('1', { rating: 3 });
  });

  it('renders read-only ratings as earned dots with no award input', () => {
    mocks.useSidebar.mockReturnValue({ isMobile: false });
    render(
      <TooltipProvider>
        <BrowserRouter>
          <ProfileListView
            data={mockData}
            isOwnProfile={false}
            onUpdate={vi.fn()}
          />
        </BrowserRouter>
      </TooltipProvider>
    );

    expect(screen.getByRole('img', { name: '2 distinctions' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Set award rating' })).toBeNull();
  });
});
