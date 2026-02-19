// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { ProfileKanbanView } from './ProfileKanbanView';
import { DndContext } from '@dnd-kit/core';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { FeedReview } from '@/types/feed';
import { MemoryRouter } from 'react-router-dom';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
    loading: false
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: []
  })
}));

afterEach(() => {
  cleanup();
});

describe('ProfileKanbanView', () => {
  it('renders columns with correct items from kanbanData', () => {
    const mockItem = (id: string, rating: number | null): FeedReview => ({
        id, rating,
        content: null, created_at: '', likes_count: 0, comments_count: 0, is_liked: false,
        user: { username: 'u', avatar_url: null },
        building: { id: 'b', name: 'B', architects: [] }
    });

    const kanbanData = {
        saved: [mockItem('s1', 0)],
        onePoint: [mockItem('1p1', 1)],
        twoPoints: [mockItem('2p1', 2)],
        threePoints: [mockItem('3p1', 3)]
    };

    render(
      <MemoryRouter>
        <DndContext>
          <ProfileKanbanView kanbanData={kanbanData} />
        </DndContext>
      </MemoryRouter>
    );

    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('1 Point')).toBeTruthy();
    expect(screen.getByText('2 Points')).toBeTruthy();
    expect(screen.getByText('3 Points')).toBeTruthy();

    // Check if items are rendered.
    // DraggableReviewCard might render specific content, but we can rely on KanbanColumn item counts or content.
    // KanbanColumn renders items count in a badge.
    // Since we have 1 item in each column, we expect four "1" badges.
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });

  it('renders empty columns correctly', () => {
    const kanbanData = {
        saved: [],
        onePoint: [],
        twoPoints: [],
        threePoints: []
    };

    render(
      <MemoryRouter>
        <DndContext>
          <ProfileKanbanView kanbanData={kanbanData} />
        </DndContext>
      </MemoryRouter>
    );

    expect(screen.getByText('Saved')).toBeTruthy();
    // Empty state should be visible
    expect(screen.getAllByText('Empty').length).toBe(4);
  });
});
