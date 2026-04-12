// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedCompactCard } from './FeedCompactCard';
import { BrowserRouter } from 'react-router';

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

  it('renders with min-w-0 class for text container and Inter (font-sans) activity lead', () => {
    render(
      <BrowserRouter>
        <FeedCompactCard
          entry={mockEntry}
        />
      </BrowserRouter>
    );

    const usernameElement = screen.getByText('testuser');
    const activityLead = usernameElement.closest("p");
    expect(activityLead?.className).toContain("font-sans");
    expect(activityLead?.className).toContain("uppercase");
    const container = usernameElement.closest('div.flex-1.min-w-0');
    expect(container).not.toBeNull();
    expect(container?.className).toContain('flex-1');
  });
});
