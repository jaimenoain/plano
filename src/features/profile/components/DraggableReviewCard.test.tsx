// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { DraggableReviewCard } from './DraggableReviewCard';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { FeedReview } from '@/types/feed';

const mockReview: FeedReview = {
  id: 'review-1',
  content: 'Test content',
  rating: 3,
  created_at: '2023-01-01T00:00:00Z',
  edited_at: null,
  status: 'visited',
  user: {
    username: 'testuser',
    avatar_url: null,
    followers_count: null,
  },
  building: {
    id: 'b-1',
    name: 'Test Building',
    address: '123 Test St',
    year_completed: '2020',
    main_image_url: null,
    slug: 'test-building',
    short_id: 'tb1',
    creditedEntities: [],
  },
  tags: [],
  likes_count: 5,
  comments_count: 2,
  is_liked: false,
  watch_with_users: [],
  images: [],
};

vi.mock('@/features/profile/components/ProfileReviewCard', () => ({
  ProfileReviewCard: ({ entry }: { entry: FeedReview }) => (
    <div data-testid="review-card">
      <span>{entry.building.name}</span>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('DraggableReviewCard', () => {
  it('renders correctly wrapped in sortable context', () => {
    render(
      <DndContext>
        <SortableContext items={['review-1']}>
          <DraggableReviewCard review={mockReview} />
        </SortableContext>
      </DndContext>
    );
    expect(screen.getByTestId('review-card')).toBeTruthy();
    expect(screen.getByText('Test Building')).toBeTruthy();
  });
});
