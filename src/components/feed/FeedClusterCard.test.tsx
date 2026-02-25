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
    const textContainer = usernameElement.closest('div.break-words');

    expect(textContainer).not.toBeNull();
    expect(textContainer?.className).toContain('min-w-0');
    expect(textContainer?.className).toContain('text-sm');
    expect(textContainer?.className).toContain('flex-1');
    expect(textContainer?.className).toContain('leading-tight');
    expect(textContainer?.className).not.toContain('truncate');

    const parentContainer = textContainer?.parentElement;
    expect(parentContainer?.className).toContain('items-start');
  });
});
