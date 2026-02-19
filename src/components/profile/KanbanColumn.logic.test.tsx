// @vitest-environment happy-dom
import { render, cleanup } from '@testing-library/react';
import { KanbanColumn } from './KanbanColumn';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    useDroppable: () => ({
      setNodeRef: vi.fn(),
      isOver: false, // Simulating NOT over the column directly
    }),
    useDndContext: () => ({
      active: { id: 'dragging-item' },
      over: { id: 'child-1' }, // Simulating being over a child item
    })
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('KanbanColumn logic', () => {
  it('applies active styles when over a child item', () => {
    const { container } = render(
        <KanbanColumn id="col-parent" title="Parent Column" ratingValue={1} items={['child-1', 'child-2']}>
          <div />
        </KanbanColumn>
    );

    // Check for the specific active classes
    const columnDiv = container.firstChild as HTMLElement;

    // We expect these to BE present
    const isActive = columnDiv.className.includes('bg-secondary/80') &&
                     columnDiv.className.includes('border-primary') &&
                     columnDiv.className.includes('ring-2');

    if (!isActive) {
        throw new Error('Active styles not applied');
    }
  });
});
