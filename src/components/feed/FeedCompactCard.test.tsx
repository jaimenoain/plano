// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedCompactCard } from './FeedCompactCard';
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

describe('FeedCompactCard', () => {
  const mockUser = {
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  const mockEntry = {
    id: '1',
    building: { id: 'b1', name: 'Building One' },
    status: 'saved',
    user: mockUser,
  } as any; // Partial mock

  it('renders with min-w-0 class for text container', () => {
    render(
      <BrowserRouter>
        <FeedCompactCard
          entry={mockEntry}
        />
      </BrowserRouter>
    );

    const usernameElement = screen.getByText('testuser');
    const container = usernameElement.closest('div.truncate');

    expect(container).not.toBeNull();
    expect(container?.className).toContain('min-w-0');
    expect(container?.className).toContain('text-sm');
    expect(container?.className).toContain('flex-1');
  });
});
