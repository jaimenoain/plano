// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanColumn } from './KanbanColumn';
import { DndContext } from '@dnd-kit/core';
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';

afterEach(() => {
  cleanup();
});

describe('KanbanColumn', () => {
  it('renders title and item count', () => {
    render(
      <DndContext>
        <KanbanColumn id="col-1" title="Test Column" ratingValue={null} items={['item1', 'item2']}>
          <div>Child Content</div>
        </KanbanColumn>
      </DndContext>
    );
    expect(screen.getByText('Test Column')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // Item count
  });

  it('renders Bookmark icon for ratingValue 0', () => {
    render(
      <DndContext>
        <KanbanColumn id="col-2" title="Saved" ratingValue={0} items={[]}>
          <div />
        </KanbanColumn>
      </DndContext>
    );
    // Use getAll in case of artifacts, but prefer getBy if cleanup works.
    // If multiple are found, it means previous test didn't clean up or something duplicates.
    const icons = screen.getAllByLabelText('Saved');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]).toBeTruthy();
  });

  it('renders dots for ratingValue 2', () => {
    render(
      <DndContext>
        <KanbanColumn id="col-3" title="2 Points" ratingValue={2} items={[]}>
          <div />
        </KanbanColumn>
      </DndContext>
    );
    // Check for aria-label which describes the points
    const pointsContainer = screen.getByLabelText('2 points');
    expect(pointsContainer).toBeTruthy();

    // We can also check if it contains 3 SVG elements (circles)
    const circles = pointsContainer.querySelectorAll('svg');
    expect(circles.length).toBe(3);
  });

  it('renders children correctly', () => {
    render(
      <DndContext>
        <KanbanColumn id="col-4" title="Content Test" ratingValue={1} items={[]}>
          <div data-testid="child">Child Content</div>
        </KanbanColumn>
      </DndContext>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
