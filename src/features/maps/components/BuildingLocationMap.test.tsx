// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BuildingLocationMap } from './BuildingLocationMap';

// Mock react-map-gl
vi.mock('react-map-gl', () => {
  const Map = ({ children }: any) => <div data-testid="map-container">{children}</div>;
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

  it('renders Tier S pin for rating 3', () => {
    render(<BuildingLocationMap {...defaultProps} rating={3} />);

    // Expect failure until implementation
    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('bg-lime-high');
    expect(pin.className).toContain('border-foreground');
  });

  it('renders Tier A pin for rating 2', () => {
    render(<BuildingLocationMap {...defaultProps} rating={2} />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('bg-white');
  });

  it('renders Tier B pin for rating 1', () => {
    render(<BuildingLocationMap {...defaultProps} rating={1} />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('bg-muted/80');
  });

  it('renders Tier S pin for Top 1% (no user rating)', () => {
    render(<BuildingLocationMap {...defaultProps} rating={0} tierRank="Top 1%" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('bg-lime-high');
  });

  it('renders Tier C pin for Standard rank (no user rating)', () => {
    render(<BuildingLocationMap {...defaultProps} rating={0} tierRank="Standard" />);

    const pin = screen.getByTestId('map-pin-container');
    expect(pin.className).toContain('bg-muted/80');
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
});
