import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { MapPin } from './MapPin';
import { PinStyle } from '../utils/pinStyling';

// @vitest-environment happy-dom

describe('MapPin Component', () => {
  afterEach(() => {
    cleanup();
  });

  const defaultStyle: PinStyle = {
    tier: 'C',
    shape: 'circle',
    zIndex: 5,
    size: 20,
    classes: 'bg-muted/80 border-white/50 border',
    showDot: false,
    showContent: true
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
    expect(pin.className).toContain('scale-125');
    expect(pin.className).toContain('z-50');
  });

  it('renders pulse for Tier S', () => {
    const sTierStyle: PinStyle = { ...defaultStyle, tier: 'S' };
    render(<MapPin style={sTierStyle} isHovered={false} />);
    const pulse = screen.getByTestId('map-pin-pulse');
    expect(pulse).toBeTruthy();
    expect(pulse.className).toContain('animate-ping-large-slow');
  });

  it('renders dot for Tier A (showDot=true)', () => {
    const aTierStyle: PinStyle = { ...defaultStyle, tier: 'A', showDot: true };
    render(<MapPin style={aTierStyle} isHovered={false} />);
    const dot = screen.getByTestId('map-pin-dot');
    expect(dot).toBeTruthy();
  });

  it('does not render dot if showDot=false', () => {
    const noDotStyle: PinStyle = { ...defaultStyle, showDot: false };
    render(<MapPin style={noDotStyle} isHovered={false} />);
    const dot = screen.queryByTestId('map-pin-dot');
    expect(dot).toBeNull();
  });
});
