// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BuildingMapTab } from './BuildingMapTab';

// The mock surfaces the map's interaction options as data attributes — a stock
// pass-through mock swallows props, and the gate IS the prop.
vi.mock('react-map-gl/maplibre', () => {
  const Map = ({ children, cooperativeGestures }: any) => (
    <div
      data-testid="map-container"
      data-cooperative-gestures={String(Boolean(cooperativeGestures))}
    >
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: Map,
    Map,
    useMap: () => ({ current: { flyTo: vi.fn() } }),
    Marker: ({ children, style, anchor }: any) => (
      <div data-testid="marker-container" data-anchor={anchor} style={style}>
        {children}
      </div>
    ),
    NavigationControl: () => <div data-testid="nav-control" />,
    GeolocateControl: () => <div data-testid="geo-control" />,
  };
});

vi.mock('maplibre-gl', () => ({
  __esModule: true,
  default: { Map: vi.fn(), NavigationControl: vi.fn(), GeolocateControl: vi.fn(), supported: () => true },
}));

const rpc = vi.fn(async () => ({ data: [], error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...(args as [])) },
}));

const defaultProps = {
  lat: 40.7,
  lng: -74,
  buildingId: 'building-1',
  buildingName: 'Seagram Building',
};

const renderTab = () =>
  render(
    <MemoryRouter>
      <BuildingMapTab {...defaultProps} />
    </MemoryRouter>,
  );

describe('BuildingMapTab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Reading the page must never turn into zooming: MapLibre's cooperative
  // gestures hand plain wheel/one-finger scroll back to the page and ask for
  // Ctrl/⌘ + scroll (or two fingers) to move the map.
  it('gates map zoom behind cooperative gestures', async () => {
    renderTab();
    const map = await screen.findByTestId('map-container');
    expect(map).toHaveAttribute('data-cooperative-gestures', 'true');
  });

  it('renders the building marker and the nearby-buildings action', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText('Seagram Building')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /show nearby buildings/i }),
    ).toBeInTheDocument();
  });
});
