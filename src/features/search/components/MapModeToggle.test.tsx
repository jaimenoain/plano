// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MapModeToggle } from './MapModeToggle';
import { useAuth } from '@/features/auth';
import { useBuildingSearchContext } from '../context/BuildingSearchContext';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/BuildingSearchContext', () => ({
  useBuildingSearchContext: vi.fn(),
}));

describe('MapModeToggle', () => {
  const switchMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({ user: { id: 'me' } });
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: null, switchMode });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Discover as active when no mode is chosen yet', () => {
    render(<MapModeToggle name="test" />);

    // SegmentedControl marks the active option with the primary text class.
    const discover = screen.getByText('Discover');
    expect(discover.className).toContain('text-text-primary');
  });

  it('switches to My Library for a signed-in user', () => {
    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('My Library'));

    expect(switchMode).toHaveBeenCalledWith('library');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('sends signed-out visitors to log in instead of an empty library', () => {
    (useAuth as Mock).mockReturnValue({ user: null });

    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('My Library'));

    expect(navigateMock).toHaveBeenCalledWith('/auth');
    expect(switchMode).not.toHaveBeenCalled();
  });

  it('does not re-apply the mode baseline when the active option is clicked again', () => {
    (useBuildingSearchContext as Mock).mockReturnValue({ mode: 'library', switchMode });

    render(<MapModeToggle name="test" />);

    fireEvent.click(screen.getByText('My Library'));

    expect(switchMode).not.toHaveBeenCalled();
  });
});
