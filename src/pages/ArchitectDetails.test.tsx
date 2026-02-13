// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ArchitectDetails from './ArchitectDetails';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock hooks
const mocks = vi.hoisted(() => ({
  useArchitect: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useArchitect', () => ({
  useArchitect: mocks.useArchitect,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mocks.useAuth,
  AuthProvider: ({ children }: any) => children,
}));

// Mock AppLayout to simplify rendering
vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

// Mock MetaHead
vi.mock('@/components/common/MetaHead', () => ({
  MetaHead: () => <div data-testid="meta-head" />,
}));

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as any,
        MapPin: () => <span data-testid="icon-map-pin" />,
        Globe: () => <span data-testid="icon-globe" />,
        Edit: () => <span data-testid="icon-edit" />,
        Map: () => <span data-testid="icon-map" />, // Mock Map icon as well
    };
});


describe('ArchitectDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
  });

  it('renders architect details with map link', async () => {
    const mockArchitect = {
      id: 'arch-123',
      name: 'Test Architect',
      type: 'individual',
      headquarters: 'Test City',
      website_url: 'https://example.com',
      bio: 'Test Bio'
    };

    mocks.useArchitect.mockReturnValue({
      architect: mockArchitect,
      buildings: [],
      loading: false,
      error: null
    });

    render(
      <MemoryRouter initialEntries={['/architect/arch-123']}>
        <Routes>
          <Route path="/architect/:id" element={<ArchitectDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Architect')).toBeTruthy();
    });

    expect(screen.getByText('Test City')).toBeTruthy();

    // Check for Map link
    const mapLink = screen.getByRole('link', { name: /map/i });
    expect(mapLink).toBeTruthy();

    // Check href
    const filters = { query: 'Test Architect' };
    const encodedFilters = encodeURIComponent(JSON.stringify(filters));

    // Check that href contains the correct path and query
    const href = mapLink.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href).toContain(`/search?filters=${encodedFilters}`);
  });
});
