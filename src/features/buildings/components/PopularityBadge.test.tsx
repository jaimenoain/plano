// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PopularityBadge } from './PopularityBadge';

describe('PopularityBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Top 1% badge correctly with city', () => {
    render(<PopularityBadge rank="Top 1%" city="New York" />);
    const badge = screen.getByText('Top 1% in New York');
    expect(badge).toBeDefined();
    // Check for gold class (partial match)
    const badgeElement = badge.closest('div'); // Badge renders a div
    expect(badgeElement?.className).toContain('bg-amber-100');
  });

  it('renders Top 1% badge correctly without city', () => {
    render(<PopularityBadge rank="Top 1%" city={null} />);
    const badge = screen.getByText('Top 1%');
    expect(badge).toBeDefined();
  });

  it('renders Top 5% badge correctly', () => {
    render(<PopularityBadge rank="Top 5%" city="London" />);
    const badge = screen.getByText('Top 5% in London');
    expect(badge).toBeDefined();
    const badgeElement = badge.closest('div');
    expect(badgeElement?.className).toContain('bg-slate-100');
  });

  it('renders Top 10% badge correctly', () => {
    render(<PopularityBadge rank="Top 10%" city="Paris" />);
    const badge = screen.getByText('Top 10% in Paris');
    expect(badge).toBeDefined();
    const badgeElement = badge.closest('div');
    expect(badgeElement?.className).toContain('bg-orange-50');
  });

  it('does not render for "Standard" rank', () => {
    const { container } = render(<PopularityBadge rank="Standard" city="Berlin" />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render for "Top 20%" rank', () => {
    const { container } = render(<PopularityBadge rank="Top 20%" city="Tokyo" />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render for null rank', () => {
    const { container } = render(<PopularityBadge rank={null} city="Rome" />);
    expect(container.firstChild).toBeNull();
  });
});
