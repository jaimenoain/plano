// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedClusterCard } from './FeedClusterCard';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src }: any) => <img src={src} data-testid="avatar-image" />,
  AvatarFallback: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 mins ago',
}));

describe('FeedClusterCard', () => {
  const mockUser = {
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  const mockEntries = [
    {
      id: '1',
      building: { id: 'b1', name: 'Building One' },
      status: 'saved',
      user: mockUser,
    },
    {
      id: '2',
      building: { id: 'b2', name: 'Building Two' },
      status: 'saved',
      user: mockUser,
    },
  ] as any; // Partial mock

  it('renders with min-w-0 class for text container', () => {
    render(
      <BrowserRouter>
        <FeedClusterCard
          entries={mockEntries}
          user={mockUser}
          timestamp={new Date().toISOString()}
        />
      </BrowserRouter>
    );

    const usernameElement = screen.getByText('testuser');
    // The structure is: <div> <Avatar/> <div className="text-sm ..."> ... </div> </div>
    const container = usernameElement.closest('div.truncate');

    expect(container).not.toBeNull();
    expect(container?.className).toContain('min-w-0');
    expect(container?.className).toContain('text-sm');
    expect(container?.className).toContain('flex-1');
  });
});
