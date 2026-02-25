// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BuildingDetails from './BuildingDetails';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseFallback from '@/utils/supabaseFallback';

// Mock IntersectionObserver
const intersectionObserverMock = () => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = vi.fn().mockImplementation(intersectionObserverMock);

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    toast: vi.fn(),
    update: vi.fn(),
    user: {
        id: 'user-123',
        email: 'architect@example.com',
        app_metadata: {
            verified_architect_id: 'a1'
        }
    }
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => {
        return { id: 'b1' };
    },
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div data-testid="app-layout">
        <h1>{title}</h1>
        {children}
    </div>
  ),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'architect', avatar_url: null, role: 'user' },
  }),
}));

// Auto-mock supabaseFallback
vi.mock('@/utils/supabaseFallback');

vi.mock('@/utils/location', () => ({
  parseLocation: () => ({ lat: 0, lng: 0 }),
}));

vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (path: string) => path ? `http://img/${path}` : null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: mocks.update.mockReturnThis(), // Mock update as chainable
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
  };

  return {
    supabase: {
      from: () => builder,
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      storage: {
          from: () => ({
              getPublicUrl: () => ({ data: { publicUrl: '' } })
          })
      }
    },
  };
});

vi.mock('@/features/maps/components/BuildingLocationMap', () => ({
  BuildingLocationMap: () => <div data-testid="map">Map</div>
}));

vi.mock('@/components/BuildingImageCard', () => ({
  BuildingImageCard: () => <div />
}));

describe('BuildingDetails Inline Editing', () => {
  const queryClient = new QueryClient({
      defaultOptions: {
          queries: {
              retry: false,
          },
      },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup specific mock implementation
    vi.mocked(supabaseFallback.fetchBuildingDetails).mockResolvedValue({
        id: 'b1',
        name: 'Test Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        slug: 'test-building',
        short_id: 'tb',
        architects: [{ name: 'Arch One', id: 'a1' }], // ID matches user verified_architect_id
        location: { type: 'Point', coordinates: [0, 0] },
        created_by: 'other-user',
        styles: [],
        architect_statement: "Original statement"
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('allows verified architect to edit official data', async () => {
    render(
      <HelmetProvider>
        <TooltipProvider>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <SidebarProvider>
                        <BuildingDetails />
                    </SidebarProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </TooltipProvider>
      </HelmetProvider>
    );

    // Wait for building name to load
    await waitFor(async () => {
        const elements = await screen.findAllByText('Test Building');
        expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // "Edit Official Data" button should be visible
    // Since it's rendered twice (mobile/desktop), we get all and click the first one
    const editButtons = await screen.findAllByText('Edit Official Data');
    expect(editButtons.length).toBeGreaterThan(0);

    // Click Edit
    fireEvent.click(editButtons[0]);

    // Inputs should appear
    // Name input (multiple due to responsive layout)
    const nameInputs = screen.getAllByPlaceholderText('Building Name');
    expect(nameInputs.length).toBeGreaterThan(0);
    const nameInput = nameInputs[0];
    expect((nameInput as HTMLInputElement).value).toBe('Test Building');

    // Year input
    const yearInputs = screen.getAllByPlaceholderText('Year');
    expect(yearInputs.length).toBeGreaterThan(0);
    const yearInput = yearInputs[0];
    expect((yearInput as HTMLInputElement).value).toBe('2000');

    // City input (rendered only once in the left column? No, duplicate logic maybe? But BuildingDetails left column is usually singular. Wait, left column is "Visuals & Map" which is top on mobile, left on desktop. It seems only one instance.)
    // Let's check the code. "LG:grid" -> "Visuals" is first child. It's not duplicated.
    const cityInput = screen.getByPlaceholderText('City');
    expect(cityInput).toBeTruthy();

    // Statement textarea (rendered in RIGHT column, which might be duplicated or shared?
    // In BuildingDetails.tsx: "RIGHT: Data & Actions" -> "hidden lg:block" for Header, but Attributes/Statement are below.
    // Wait, "BuildingAttributes" is rendered twice: once for mobile (lg:hidden), once for desktop (hidden lg:grid).
    // The Statement block is rendered below attributes in RIGHT column.
    // The RIGHT column is `div className="space-y-8 mt-6 lg:mt-0"`
    // Wait, looking at the code I wrote:
    // Mobile Header is separate.
    // Mobile Attributes is separate.
    // Then `lg:grid lg:grid-cols-2`.
    // LEFT column.
    // RIGHT column.
    // Statement block is in RIGHT column.
    // Is RIGHT column hidden on mobile?
    // No. `div className="lg:grid lg:grid-cols-2 ..."` wraps both.
    // So statement block should be unique?
    // But let's be safe and use getAllByPlaceholderText just in case.
    const statementInputs = screen.getAllByPlaceholderText('Add an architectural statement...');
    expect(statementInputs.length).toBeGreaterThan(0);
    const statementInput = statementInputs[0];
    expect(statementInput.textContent).toBe('Original statement');

    // Change values
    fireEvent.change(nameInput, { target: { value: 'Updated Building' } });
    fireEvent.change(statementInput, { target: { value: 'New statement' } });

    // Click Save
    // Save button is also rendered multiple times (mobile actions vs desktop actions)
    const saveButtons = screen.getAllByText('Save');
    expect(saveButtons.length).toBeGreaterThan(0);
    fireEvent.click(saveButtons[0]);

    // Verify update call
    await waitFor(() => {
        expect(mocks.update).toHaveBeenCalledWith({
            name: 'Updated Building',
            year_completed: 2000,
            city: 'Metropolis',
            country: 'USA',
            architect_statement: 'New statement'
        });
    });

    // Verify exit edit mode (inputs gone)
    await waitFor(() => {
        const inputs = screen.queryAllByPlaceholderText('Building Name');
        expect(inputs.length).toBe(0);
    });
  });
});
