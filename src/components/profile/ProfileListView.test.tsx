// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProfileListView } from './ProfileListView';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { FeedReview } from '@/types/feed';

const mocks = vi.hoisted(() => ({
  useSidebar: vi.fn(),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: mocks.useSidebar,
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
      architects: ['Architect 1'],
      year_completed: 2020,
      city: 'Test City',
      country: 'Test Country',
      main_image_url: 'http://example.com/image.jpg',
    },
    user: {
      username: 'user1',
      avatar_url: null,
    },
    images: []
  }
];

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
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
    expect(screen.getByText('Architect')).toBeTruthy();
    expect(screen.getByText('Test Building')).toBeTruthy();

    // Check Data Content
    expect(screen.getByText('Architect 1')).toBeTruthy();
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
    expect(screen.queryByText('Architect')).toBeNull();
    expect(screen.queryByText('Year')).toBeNull();
    expect(screen.queryByText('Country')).toBeNull();

    // Stacked content
    expect(screen.getByText('Test Building')).toBeTruthy();

    // StatusBadge should be visible
    expect(screen.getByRole('button', { name: 'Visited' })).toBeTruthy();

    // Hidden column content
    expect(screen.queryByText('Architect 1')).toBeNull();
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

    // InlineRating renders 3 buttons, each with a circle inside.
    const starButtons = screen.getAllByRole('button').filter(button => button.querySelector('svg'));

    // We expect 3 star buttons
    expect(starButtons.length).toBeGreaterThanOrEqual(3);

    // Click the 3rd star
    fireEvent.click(starButtons[2]);

    expect(onUpdate).toHaveBeenCalledWith('1', { rating: 3 });
  });
});
