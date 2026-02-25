// @vitest-environment happy-dom
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
    upsert: vi.fn(),
    user: { id: 'user-123', email: 'test@example.com' } // Stable user object
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
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png', role: 'user' },
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
  const userBuildingEntry = {
      id: 'review-1',
      content: 'Great place',
      rating: 4,
      created_at: '2023-01-01',
      edited_at: '2023-01-01',
      user_id: 'user-123',
      building_id: 'b1',
      status: 'visited',
      images: [],
      user: {
        username: 'testuser',
        avatar_url: null
      }
  };

  const createQueryBuilder = (table: string) => {
    let listResult: any = { data: [], error: null };
    let singleResult: any = { data: null, error: null };

    if (table === 'user_buildings') {
       listResult = { data: [userBuildingEntry], error: null };
       singleResult = { data: userBuildingEntry, error: null };
    } else if (table === 'collection_items') {
       listResult = { data: [], error: null };
       singleResult = { data: null, error: null };
    } else if (table === 'review_links') {
       listResult = { data: [], error: null };
       singleResult = { data: null, error: null };
    } else if (table === 'follows') {
       listResult = { data: [], error: null };
       singleResult = { data: null, error: null };
    } else if (table === 'image_likes') {
       listResult = { data: [], error: null };
       singleResult = { data: null, error: null };
    } else if (table === 'recommendations') {
       listResult = { data: [], error: null };
       singleResult = { data: null, error: null };
    }

    const builder: any = {
        then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject)
    };

    builder.select = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockImplementation((col, val) => {
        return builder;
    });
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockResolvedValue(singleResult);

    // Update/Upsert setup
    builder.upsert = mocks.upsert.mockResolvedValue({ data: null, error: null });
    builder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.delete = vi.fn().mockResolvedValue({ data: null, error: null });

    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
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

describe('BuildingDetails Interaction', () => {
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
        architects: [{ architect: { name: 'Arch One', id: 'a1' } }],
        location: { type: 'Point', coordinates: [0, 0] },
        created_by: 'other-user',
        styles: [],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles status from Visited to Saved when badge is clicked', async () => {
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

    // Initial state: "Visited" (from mock)
    // Wait for "Your Activity" section
    await waitFor(() => {
        expect(screen.getByText('Your Activity')).toBeTruthy();
    });

    const visitedBadges = screen.getAllByText('Visited');
    const interactiveBadge = visitedBadges.find(el => el.classList.contains('cursor-pointer'));

    expect(interactiveBadge).toBeTruthy();

    // Click to toggle
    fireEvent.click(interactiveBadge!);

    // Verify Supabase upsert call
    await waitFor(() => {
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'pending',
                user_id: 'user-123',
                building_id: 'b1'
            }),
            expect.anything()
        );
    });

    // Optimistic Update: Should see "Saved" now (in place of Visited badge)
    await waitFor(() => {
        const savedBadges = screen.getAllByText('Saved');
        const interactiveSaved = savedBadges.find(el => el.classList.contains('cursor-pointer'));
        expect(interactiveSaved).toBeTruthy();
    });
  });
});
