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
  },
  building: {
    id: 'b-1',
    name: 'Test Building',
    address: '123 Test St',
    year_completed: '2020',
    main_image_url: null,
    slug: 'test-building',
    short_id: 'tb1',
    architects: [],
  },
  tags: [],
  likes_count: 5,
  comments_count: 2,
  is_liked: false,
  watch_with_users: [],
  images: [],
};

// Mock the ReviewCard component since it's complex
vi.mock('@/components/feed/ReviewCard', () => ({
  ReviewCard: ({ entry, variant }: { entry: FeedReview, variant: string }) => (
    <div data-testid="review-card">
      <span>{entry.building.name}</span>
      <span>{variant}</span>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('DraggableReviewCard Drag Functionality', () => {
  it('renders with cursor-grab when dragging is enabled (default)', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={['review-1']}>
          <DraggableReviewCard review={mockReview} isDragEnabled={true} />
        </SortableContext>
      </DndContext>
    );

    // We expect the wrapper div (which is the motion.div) to have cursor-grab
    // But since DraggableReviewCard renders a motion.div as root, we can check the first child or search by class
    // Wait, the component returns motion.div with className directly.
    // Let's find the element that contains the review card.
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('cursor-grab')).toBe(true);
  });

  it('renders WITHOUT cursor-grab when dragging is disabled', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={['review-1']}>
          <DraggableReviewCard review={mockReview} isDragEnabled={false} />
        </SortableContext>
      </DndContext>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains('cursor-grab')).toBe(false);
  });
});
