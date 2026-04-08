// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BuildingDetails from './BuildingDetails';
import { BrowserRouter } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
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
    user: { id: 'user-123', email: 'test@example.com' }, // Stable user object
    /** Mirrors loader output — BuildingDetails reads `useLoaderData`, not `fetchBuildingDetails` in the client. */
    loaderData: {
      building: null as Record<string, unknown> | null,
      heroImageUrl: null as string | null,
      buildingCredits: [] as unknown[],
    },
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => {
        return { id: 'b1' };
    },
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useLoaderData: () => mocks.loaderData,
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

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/features/profile/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png', role: 'user' },
    loading: false,
    refetch: vi.fn(),
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

vi.mock('@/features/buildings/components/BuildingImageCard', () => ({
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

    const building = {
        id: 'b1',
        name: 'Test Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        slug: 'test-building',
        short_id: 'tb',
        location: { type: 'Point', coordinates: [0, 0] },
        created_by: 'other-user',
        styles: [],
    };
    vi.mocked(supabaseFallback.fetchBuildingDetails).mockResolvedValue(building as any);
    mocks.loaderData.building = building;
    mocks.loaderData.heroImageUrl = null;
    mocks.loaderData.buildingCredits = [];
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles status from Visited to Saved when badge is clicked', async () => {
    render(
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SidebarProvider>
              <BuildingDetails />
            </SidebarProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </TooltipProvider>
    );

    // Wait for building name to load
    await waitFor(async () => {
        const elements = await screen.findAllByText('Test Building');
        expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    await waitFor(() => {
        expect(screen.getByRole("button", { name: /visited/i })).toBeTruthy();
    });

    const saveButton = screen.getByRole("button", { name: /^save$/i });
    fireEvent.click(saveButton);

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
        const save = screen.getByRole("button", { name: /^save$/i });
        expect(save.className).toContain("text-text-primary");
    });
  });

  it('renders lost to time message and Navigate to Site button when status is lost', async () => {
    const lostBuilding = {
        id: 'b1',
        name: 'Test Lost Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        slug: 'test-lost-building',
        short_id: 'tb',
        status: 'Lost',
        location: { type: 'Point', coordinates: [0, 0] },
        created_by: 'other-user',
        styles: [],
    };
    vi.mocked(supabaseFallback.fetchBuildingDetails).mockResolvedValue(lostBuilding as any);
    mocks.loaderData.building = lostBuilding;
    mocks.loaderData.heroImageUrl = null;
    mocks.loaderData.buildingCredits = [];

    render(
      <TooltipProvider>
          <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                  <SidebarProvider>
                      <BuildingDetails />
                  </SidebarProvider>
              </BrowserRouter>
          </QueryClientProvider>
      </TooltipProvider>
    );

    await waitFor(async () => {
        const elements = await screen.findAllByText('Test Lost Building');
        expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // Assert that the lost building message appears
    expect(screen.getByText('This building is lost to time. It no longer stands at this location.')).toBeTruthy();

    // Assert that the directions button says "Navigate to Site"
    expect(screen.getByRole("button", { name: /Navigate to Site/i })).toBeTruthy();
  });
});
