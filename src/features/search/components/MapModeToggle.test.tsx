// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MapModeToggle } from './MapModeToggle';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';
import { useAuth } from '@/features/auth';

vi.mock('../context/BuildingSearchContext', () => ({
  useBuildingSearchContext: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

describe('MapModeToggle', () => {
  const switchMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: null, switchMode });
    (useAuth as Mock).mockReturnValue({ user: { id: 'u1' } });
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

  it('switches to Discover', () => {
    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('Discover'));

    expect(switchMode).toHaveBeenCalledWith('discover');
  });

  it('switches to My map in place', () => {
    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('My map'));

    expect(switchMode).toHaveBeenCalledWith('library');
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

  it('renders My map as the active segment when mode is library', () => {
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'library', switchMode });

    render(<MapModeToggle name="test" />);

    expect(screen.getByText('My map').className).toContain('text-text-primary');
  });

  it('switches away from My map in place, dropping the library filters (handled by switchMode)', () => {
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'library', switchMode });

    render(<MapModeToggle name="test" />);
    fireEvent.click(screen.getByText('Discover'));

    expect(switchMode).toHaveBeenCalledWith('discover');
  });

  describe('signed out', () => {
    beforeEach(() => {
      (useAuth as Mock).mockReturnValue({ user: null });
    });

    it('offers no My map segment — a personal library is a dead end', () => {
      render(<MapModeToggle name="test" />);

      expect(screen.queryByText('My map')).toBeNull();
      expect(screen.getByText('Discover')).toBeInTheDocument();
    });

    it('falls a ?mode=library deep link back to All rather than stranding it', () => {
      (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'library', switchMode });

      render(<MapModeToggle name="test" />);

      expect(switchMode).toHaveBeenCalledWith(null);
    });
  });
});
