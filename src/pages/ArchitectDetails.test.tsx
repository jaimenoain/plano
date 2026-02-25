// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ArchitectDetails from './ArchitectDetails';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock hooks
const mocks = vi.hoisted(() => ({
  useArchitect: vi.fn(),
  useAuth: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/hooks/useArchitect', () => ({
  useArchitect: mocks.useArchitect,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mocks.useAuth,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: () => ({
        insert: mocks.insert
    })
  },
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
        Map: () => <span data-testid="icon-map" />,
        BadgeCheck: () => <span data-testid="icon-badge-check" />,
        Check: () => <span data-testid="icon-check" />,
    };
});

// Mock Dialog - mocking shadcn components to ensure they render content when open
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
}));


describe('ArchitectDetails', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    mocks.rpc.mockResolvedValue({ data: { is_verified: false, my_claim_status: null }, error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  const mockArchitect = {
    id: 'arch-123',
    name: 'Test Architect',
    type: 'individual',
    headquarters: 'Test City',
    website_url: 'https://example.com',
    bio: 'Test Bio'
  };

  it('renders architect details with map link', async () => {
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
      expect(screen.getByText('Test Architect')).toBeInTheDocument();
    });

    expect(screen.getByText('Test City')).toBeInTheDocument();

    // Check for Map link
    const mapLink = screen.getByRole('link', { name: /view on map/i });
    expect(mapLink).toBeInTheDocument();
  });

  it('shows "Claim this Profile" button when logged in and not claimed', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.useArchitect.mockReturnValue({
      architect: mockArchitect,
      buildings: [],
      loading: false,
      error: null
    });
    mocks.rpc.mockResolvedValue({ data: { is_verified: false, my_claim_status: null }, error: null });

    render(
      <MemoryRouter initialEntries={['/architect/arch-123']}>
        <Routes>
          <Route path="/architect/:id" element={<ArchitectDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /claim this profile/i })).toBeInTheDocument();
    });
  });

  it('does not show "Claim this Profile" button when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
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
      expect(screen.getByText('Test Architect')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /claim this profile/i })).not.toBeInTheDocument();
  });

  it('shows "Verified Architect" badge when verified', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    mocks.useArchitect.mockReturnValue({
      architect: mockArchitect,
      buildings: [],
      loading: false,
      error: null
    });
    mocks.rpc.mockResolvedValue({ data: { is_verified: true, my_claim_status: null }, error: null });

    render(
      <MemoryRouter initialEntries={['/architect/arch-123']}>
        <Routes>
          <Route path="/architect/:id" element={<ArchitectDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Verified Architect')).toBeInTheDocument();
      expect(screen.getByTestId('icon-badge-check')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /claim this profile/i })).not.toBeInTheDocument();
  });

  it('shows "Claim Pending" badge when user has pending claim', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.useArchitect.mockReturnValue({
      architect: mockArchitect,
      buildings: [],
      loading: false,
      error: null
    });
    mocks.rpc.mockResolvedValue({ data: { is_verified: false, my_claim_status: 'pending' }, error: null });

    render(
      <MemoryRouter initialEntries={['/architect/arch-123']}>
        <Routes>
          <Route path="/architect/:id" element={<ArchitectDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Claim Pending')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /claim this profile/i })).not.toBeInTheDocument();
  });

  it('opens claim dialog when clicking button', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    mocks.useArchitect.mockReturnValue({
      architect: mockArchitect,
      buildings: [],
      loading: false,
      error: null
    });
    mocks.rpc.mockResolvedValue({ data: { is_verified: false, my_claim_status: null }, error: null });

    render(
      <MemoryRouter initialEntries={['/architect/arch-123']}>
        <Routes>
          <Route path="/architect/:id" element={<ArchitectDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /claim this profile/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /claim this profile/i }));

    await waitFor(() => {
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/claim test architect/i)).toBeInTheDocument();
    });
  });
});
