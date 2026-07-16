import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { MapPin } from './MapPin';
import { PinStyle } from '../utils/pinStyling';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

// @vitest-environment happy-dom

describe('MapPin Component', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultStyle: PinStyle = {
    rank: 1,
    shape: 'circle',
    zIndex: 5,
    size: 20,
    classes: 'border-white/50 border',
    backgroundColor: MAP_MARKER_FILL.surfaceMuted80,
    dots: 0,
    savedMark: false,
    innerMarkColor: MAP_MARKER_FILL.brandPrimary,
    showContent: true,
  };

  it('renders with default circle style', () => {
    render(<MapPin style={defaultStyle} isHovered={false} />);
    const pin = screen.getByTestId('map-pin-container');
    expect(pin).toBeTruthy();
    expect(pin.className).toContain('rounded-full');
    expect(pin.className).not.toContain('rounded-br-none');
    expect(pin.style.width).toBe('20px');
    expect(pin.style.height).toBe('20px');
  });

  it('renders with pin (teardrop) shape', () => {
    const pinStyle: PinStyle = { ...defaultStyle, shape: 'pin' };
    render(<MapPin style={pinStyle} isHovered={false} />);
    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('rounded-br-none');
    expect(pin.className).toContain('rotate-45');
  });

  it('renders children correctly', () => {
    render(
      <MapPin style={defaultStyle} isHovered={false}>
        <span data-testid="pin-content">42</span>
      </MapPin>
    );
    expect(screen.getByTestId('pin-content')).toBeTruthy();
  });

  it('applies hover styles when isHovered is true', () => {
    render(<MapPin style={defaultStyle} isHovered={true} />);
    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('scale-[1.3]');
    expect(pin.className).toContain('z-50');
  });

  it('never renders the retired rank-5 pulse (static top tier)', () => {
    const topStyle: PinStyle = {
      ...defaultStyle,
      rank: 5,
      backgroundColor: MAP_MARKER_FILL.brandPrimary,
    };
    render(<MapPin style={topStyle} isHovered={false} />);
    expect(screen.queryByTestId('map-pin-pulse')).toBeNull();
  });

  it('renders the personal award dots with the inner mark colour', () => {
    const ratedStyle: PinStyle = {
      ...defaultStyle,
      rank: 5,
      dots: 3,
      innerMarkColor: MAP_MARKER_FILL.white,
    };
    render(<MapPin style={ratedStyle} isHovered={false} />);
    const dots = screen.getByTestId('map-pin-dots');
    expect(dots.children).toHaveLength(3);
    expect((dots.children[0] as HTMLElement).style.backgroundColor).toBe(
      MAP_MARKER_FILL.white
    );
  });

  it('renders 1 dot for a 1-pt pin', () => {
    render(<MapPin style={{ ...defaultStyle, rank: 3, dots: 1 }} isHovered={false} />);
    expect(screen.getByTestId('map-pin-dots').children).toHaveLength(1);
  });

  it('renders the saved mark when set', () => {
    render(<MapPin style={{ ...defaultStyle, savedMark: true }} isHovered={false} />);
    expect(screen.getByTestId('map-pin-saved-mark')).toBeTruthy();
  });

  it('lets dots win over the saved mark (never both)', () => {
    render(
      <MapPin style={{ ...defaultStyle, dots: 2, savedMark: true }} isHovered={false} />
    );
    expect(screen.getByTestId('map-pin-dots')).toBeTruthy();
    expect(screen.queryByTestId('map-pin-saved-mark')).toBeNull();
  });

  it('renders neither dots nor mark by default', () => {
    render(<MapPin style={defaultStyle} isHovered={false} />);
    expect(screen.queryByTestId('map-pin-dots')).toBeNull();
    expect(screen.queryByTestId('map-pin-saved-mark')).toBeNull();
  });
});
