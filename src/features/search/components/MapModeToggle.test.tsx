// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MapModeToggle } from './MapModeToggle';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';
import { useAuth } from '@/features/auth';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
let currentParams = new URLSearchParams();

vi.mock('react-router', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [currentParams, vi.fn()],
}));

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
    currentParams = new URLSearchParams();
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

  it('switches to My map in place — no navigation away from /search', () => {
    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('My map'));

    expect(switchMode).toHaveBeenCalledWith('library');
    expect(navigate).not.toHaveBeenCalled();
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

  describe('on /map (routeMode="library")', () => {
    beforeEach(() => {
      (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'library', switchMode });
    });

    it('renders My map as the active segment', () => {
      render(<MapModeToggle name="test" routeMode="library" />);

      expect(screen.getByText('My map').className).toContain('text-text-primary');
    });

    it('navigates to /search for the other segments, keeping the viewport and dropping the library filters', () => {
      currentParams = new URLSearchParams(
        'lat=51.5&lng=-0.12&zoom=13&status=visited,saved,pending&rated_by=jaime&minRating=2&category=museum',
      );

      render(<MapModeToggle name="test" routeMode="library" />);
      fireEvent.click(screen.getByText('Discover'));

      expect(switchMode).not.toHaveBeenCalled();
      const to = navigate.mock.calls[0][0] as string;
      expect(to).toContain('/search?');
      expect(to).toContain('mode=discover');
      expect(to).toContain('lat=51.5');
      expect(to).toContain('category=museum');
      expect(to).not.toContain('status=');
      expect(to).not.toContain('rated_by=');
      expect(to).not.toContain('minRating=');
    });
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
