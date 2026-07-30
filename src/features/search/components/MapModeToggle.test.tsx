// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MapModeToggle } from './MapModeToggle';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';

vi.mock('../context/BuildingSearchContext', () => ({
  useBuildingSearchContext: vi.fn(),
}));

describe('MapModeToggle', () => {
  const switchMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: null, switchMode });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows All as active when no mode is chosen yet', () => {
    render(<MapModeToggle name="test" />);

    // SegmentedControl marks the active option with the primary text class.
    const all = screen.getByText('All');
    expect(all.className).toContain('text-text-primary');
  });

  it('offers no library segment — My Map is its own destination at /map', () => {
    render(<MapModeToggle name="test" />);

    expect(screen.queryByText(/library/i)).toBeNull();
    expect(screen.queryByText(/my map/i)).toBeNull();
  });

  it('switches to Discover', () => {
    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('Discover'));

    expect(switchMode).toHaveBeenCalledWith('discover');
  });

  it('returns to All (null) when the All segment is clicked', () => {
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'discover', switchMode });

    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('All'));

    expect(switchMode).toHaveBeenCalledWith(null);
  });

  it('does not re-apply the mode baseline when the active option is clicked again', () => {
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'discover', switchMode });

    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('Discover'));

    expect(switchMode).not.toHaveBeenCalled();
  });
});
