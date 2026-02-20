// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders correctly with required columns', () => {
    const onStatusChange = vi.fn();
    const onRate = vi.fn();
    render(
      <TooltipProvider>
        <BrowserRouter>
          <ProfileListView
            data={mockData}
            isOwnProfile={true}
            onStatusChange={onStatusChange}
            onRate={onRate}
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
    expect(screen.getByText('Reviews')).toBeTruthy();
    expect(screen.getByText('This is a long review that should be truncated.')).toBeTruthy();
  });
});
