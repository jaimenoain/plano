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

    // Root container uses active background/border when column is over
    const columnDiv = container.firstChild as HTMLElement;
    expect(columnDiv.className).toContain('bg-brand-secondary');
    expect(columnDiv.className).toContain('border-brand-primary');

    // Empty state also picks up active styles
    const emptyLabel = screen.getByText('No Drag Over buildings');
    const emptyState = emptyLabel.closest('div');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.className).toContain('border-brand-primary');
    expect(emptyState?.className).toContain('bg-brand-secondary');
  });
});
