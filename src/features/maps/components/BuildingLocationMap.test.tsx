// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { BuildingLocationMap } from './BuildingLocationMap';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

// Mock react-map-gl/maplibre. The Map forwards a ref exposing the cooperative
// gesture handler, because the component drives it imperatively on expand, and
// mirrors interaction options as data attributes (a plain mock swallows props).
const cooperativeGestures = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
  isEnabled: vi.fn(() => true),
}));

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');
  const Map = React.forwardRef(({ children, cooperativeGestures: gate }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getMap: () => ({ cooperativeGestures }),
    }));
    return (
      <div data-testid="map-container" data-cooperative-gestures={String(Boolean(gate))}>
        {children}
      </div>
    );
  });
  return {
    __esModule: true,
    default: Map,
    Map,
    useMap: () => ({
      current: {
        flyTo: vi.fn(),
      },
    }),
    Marker: ({ children, style, anchor }: any) => (
      <div
        data-testid="marker-container"
        data-anchor={anchor}
        style={style}
      >
        {children}
      </div>
    ),
    NavigationControl: () => <div data-testid="nav-control" />,
    GeolocateControl: () => <div data-testid="geo-control" />,
  };
});

// Mock maplibre-gl
vi.mock('maplibre-gl', () => {
  return {
    __esModule: true,
    default: {
      Map: vi.fn(),
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
      // Add other properties if accessed by react-map-gl internally
      supported: () => true,
    },
  };
});

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // @ts-ignore
    ...actual,
  };
});

describe('BuildingLocationMap', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultProps = {
    lat: 10,
    lng: 10,
    locationPrecision: 'exact' as const,
  };

  // The mini-map has no MapProvider, so it renders the global code: the pin
  // wears the building's percentile band; the user's own relationship shows as
  // the saved mark, never as a different rank.
  it("renders the rank-5 face (black, white ring) for 'Top 1%'", () => {
    render(<BuildingLocationMap {...defaultProps} rating={0} tierRank="Top 1%" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
    // Black face, white ring — the ring inverted when the fill stopped being lime.
    expect(pin.className).toContain('border-white');
  });

  it("renders the rank-4 face (white, black ring) for 'Top 5%'", () => {
    render(<BuildingLocationMap {...defaultProps} tierRank="Top 5%" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-text-primary');
  });

  it("renders the rank-3 face (white, black hairline ring) for 'Top 10%'", () => {
    render(<BuildingLocationMap {...defaultProps} tierRank="Top 10%" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-text-primary');
  });

  it('renders the quietest rank-1 face for Standard rank — opaque, with a strong ring', () => {
    render(<BuildingLocationMap {...defaultProps} rating={0} tierRank="Standard" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(pin.className).toContain('border-border-strong');
  });

  it('shows the saved mark for a rated building without changing its global rank', () => {
    render(<BuildingLocationMap {...defaultProps} rating={3} tierRank="Standard" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.style.backgroundColor).toBe(MAP_MARKER_FILL.white);
    expect(screen.getByTestId('map-pin-saved-mark')).toBeTruthy();
  });

  it("shows the saved mark for a 'pending' (wishlisted) building", () => {
    render(<BuildingLocationMap {...defaultProps} status="pending" tierRank="Top 5%" />);

    expect(screen.getByTestId('map-pin-saved-mark')).toBeTruthy();
  });

  it('uses bottom anchor for exact location (pin shape)', () => {
    render(<BuildingLocationMap {...defaultProps} rating={3} />);

    const marker = screen.getByTestId('marker-container');
    expect(marker.getAttribute('data-anchor')).toBe('bottom');
  });

  it('uses center anchor for approximate location (circle shape)', () => {
    render(<BuildingLocationMap {...defaultProps} locationPrecision="approximate" rating={3} />);

    const marker = screen.getByTestId('marker-container');
    expect(marker.getAttribute('data-anchor')).toBe('center');
  });

  it('calls onToggleExpand when clicking backdrop in expanded mode', () => {
    const onToggleExpand = vi.fn();
    render(<BuildingLocationMap {...defaultProps} isExpanded={true} onToggleExpand={onToggleExpand} />);

    const backdrop = screen.getByTestId('map-backdrop');
    fireEvent.click(backdrop);

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggleExpand when clicking the map inner container in expanded mode', () => {
    const onToggleExpand = vi.fn();
    render(<BuildingLocationMap {...defaultProps} isExpanded={true} onToggleExpand={onToggleExpand} />);

    const innerContainer = screen.getByTestId('map-inner-container');
    fireEvent.click(innerContainer);

    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  // Inline in the rail the map must hand plain scroll back to the page; expanded
  // it fills the viewport, so the gate would be friction with nothing behind to
  // scroll.
  it('gates map zoom behind cooperative gestures when inline', () => {
    render(<BuildingLocationMap {...defaultProps} />);

    expect(screen.getByTestId('map-container')).toHaveAttribute(
      'data-cooperative-gestures',
      'true',
    );
    expect(cooperativeGestures.enable).toHaveBeenCalled();
    expect(cooperativeGestures.disable).not.toHaveBeenCalled();
  });

  it('lifts the gate while expanded and restores it on collapse', () => {
    const { rerender } = render(
      <BuildingLocationMap {...defaultProps} isExpanded={false} onToggleExpand={vi.fn()} />,
    );
    cooperativeGestures.enable.mockClear();

    rerender(
      <BuildingLocationMap {...defaultProps} isExpanded={true} onToggleExpand={vi.fn()} />,
    );
    expect(cooperativeGestures.disable).toHaveBeenCalledTimes(1);

    rerender(
      <BuildingLocationMap {...defaultProps} isExpanded={false} onToggleExpand={vi.fn()} />,
    );
    expect(cooperativeGestures.enable).toHaveBeenCalledTimes(1);
  });

  it('shows fallback when coordinates are not finite', async () => {
    render(<BuildingLocationMap {...defaultProps} lat={NaN} lng={10} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Location unavailable');
    });
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });
});
