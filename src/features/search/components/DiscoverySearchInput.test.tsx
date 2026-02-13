// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DiscoverySearchInput } from './DiscoverySearchInput';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock usePlacesAutocomplete
vi.mock('use-places-autocomplete', () => ({
  default: () => ({
    ready: true,
    value: 'Paris',
    suggestions: { status: 'OK', data: [{ place_id: '1', description: 'Paris, France' }] },
    setValue: vi.fn(),
    clearSuggestions: vi.fn(),
  }),
  getGeocode: vi.fn(),
  getLatLng: vi.fn(),
}));

// Mock Google Maps loader
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn().mockResolvedValue({}),
}));

describe('DiscoverySearchInput', () => {
  beforeEach(() => {
    // Mock window.google
    window.google = { maps: { places: {} } } as any;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with absolute positioning by default', async () => {
    render(
      <DiscoverySearchInput
        value="Paris"
        onSearchChange={vi.fn()}
        onLocationSelect={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Paris' } });

    const suggestion = await screen.findByText('Paris, France');
    const container = suggestion.closest('.z-50');

    expect(container).not.toBeNull();
    if (container) {
      expect(container.className).toContain('absolute');
      expect(container.className).not.toContain('relative mt-1');
    }
  });

  it('renders with relative positioning when dropdownMode="relative"', async () => {
    render(
      <DiscoverySearchInput
        value="Paris"
        onSearchChange={vi.fn()}
        onLocationSelect={vi.fn()}
        dropdownMode="relative"
      />
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Paris' } });

    const suggestion = await screen.findByText('Paris, France');
    const container = suggestion.closest('.z-50');

    expect(container).not.toBeNull();
    if (container) {
      expect(container.className).toContain('relative');
      expect(container.className).not.toContain('absolute');
    }
  });
});
