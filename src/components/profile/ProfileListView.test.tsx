// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProfileListView } from './ProfileListView';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { FeedReview } from '@/types/feed';

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
  });

  it('renders correctly with required columns', () => {
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

    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Rating')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('Architect')).toBeTruthy();
    expect(screen.getByText('Test Building')).toBeTruthy();
    // Use getAllByText for 'Reviews' if it appears multiple times (header vs content or duplication)
    // The header is "Review", not "Reviews".
    // The StatusBadge is "Reviews".
    const reviewsText = screen.getAllByText('Reviews');
    expect(reviewsText.length).toBeGreaterThan(0);
    expect(screen.getByText('This is a long review that should be truncated.')).toBeTruthy();
  });

  it('calls onUpdate when status is changed', () => {
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

      // Use getByRole to be more specific
      const statusButton = screen.getByRole('button', { name: 'Reviews' });
      fireEvent.click(statusButton);

      expect(onUpdate).toHaveBeenCalledWith('1', { status: 'pending' });
  });
});
