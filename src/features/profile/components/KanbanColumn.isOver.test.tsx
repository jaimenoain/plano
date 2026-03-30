// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanColumn } from './KanbanColumn';
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

// Mock @dnd-kit/core to simulate isOver: true
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    useDroppable: () => ({
      setNodeRef: vi.fn(),
      isOver: true,
    }),
    useDndContext: () => ({
      active: null,
      over: null,
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('KanbanColumn isOver state', () => {
  it('applies active styles when isOver is true', () => {
    const { container } = render(
        <KanbanColumn id="col-over" title="Drag Over" ratingValue={1} items={[]}>
          <div />
        </KanbanColumn>
    );

    // Check for the specific classes we added
    const columnDiv = container.firstChild as HTMLElement;
    expect(columnDiv.className).toContain('bg-secondary/80');
    expect(columnDiv.className).toContain('border-primary');
    expect(columnDiv.className).toContain('ring-2');

    // Check empty state styling
    // The empty state renders because items is empty array
    const emptyState = screen.getByText('No Drag Over buildings').closest('div');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.className).toContain('border-primary');
    expect(emptyState?.className).toContain('bg-primary/10');
  });
});
