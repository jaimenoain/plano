// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { ProfileKanbanView } from './ProfileKanbanView';
import { DndContext } from '@dnd-kit/core';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { FeedReview } from '@/types/feed';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
vi.mock('@/features/auth/hooks/useAuth', () => ({
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

describe('ProfileKanbanView', () => {
  it('renders columns with correct items from kanbanData', () => {
    // created_at must be a valid date — the card renders a relative timestamp
    // (FeedActivityRow → formatDistanceToNow), which throws on an empty string.
    const mockItem = (id: string, rating: number | null): FeedReview => ({
        id, rating,
        content: null, created_at: '2023-01-01T00:00:00.000Z', likes_count: 0, comments_count: 0, is_liked: false,
        user: { username: 'u', avatar_url: null, followers_count: null },
        building: { id: 'b', name: 'B', creditedEntities: [] }
    });

    const kanbanData = {
        saved: [mockItem('s1', 0)],
        onePoint: [mockItem('1p1', 1)],
        twoPoints: [mockItem('2p1', 2)],
        threePoints: [mockItem('3p1', 3)]
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DndContext>
            <ProfileKanbanView kanbanData={kanbanData} />
          </DndContext>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Impressive')).toBeTruthy();
    expect(screen.getByText('Essential')).toBeTruthy();
    expect(screen.getByText('Masterpiece')).toBeTruthy();

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
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DndContext>
            <ProfileKanbanView kanbanData={kanbanData} />
          </DndContext>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Saved')).toBeTruthy();
    // Empty state should be visible
    expect(screen.getByText('No saved buildings')).toBeTruthy();
    expect(screen.getByText('No Impressive buildings')).toBeTruthy();
    expect(screen.getByText('No Essential buildings')).toBeTruthy();
    expect(screen.getByText('No Masterpiece buildings')).toBeTruthy();
  });
});
