// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedClusterCard } from './FeedClusterCard';
import { BrowserRouter } from 'react-router';

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

  it('renders with wrapping text container (no truncate)', () => {
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
    expect(usernameElement.className).toContain('text-sm');
    expect(usernameElement.className).toContain('text-text-primary');
    expect(usernameElement.className).not.toContain('truncate');

    const row = usernameElement.parentElement;
    expect(row?.className).toContain('flex');
    expect(row?.className).toContain('items-center');
  });
});
