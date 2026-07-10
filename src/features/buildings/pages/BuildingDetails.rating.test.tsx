// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BuildingDetails from './BuildingDetails';
import { BrowserRouter } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseFallback from '@/utils/supabaseFallback';

// Mock IntersectionObserver. Must be a real constructor so `new
// IntersectionObserver(...)` works under Vitest v4 (an arrow-function
// mockImplementation is not construct-callable there).
window.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
  this.observe = () => null;
  this.unobserve = () => null;
  this.disconnect = () => null;
}) as unknown as typeof IntersectionObserver;

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    toast: vi.fn(),
    upsert: vi.fn(),
    user: { id: 'user-123', email: 'test@example.com' }, // Stable user object
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
    // Mocked user entry: visited, rating 0 ("Interesting" tier — the default,
    // not a null/unrated state under the four-tier MichelinRatingInput model).
  const userBuildingEntry = {
      id: 'review-1',
      content: '',
      rating: 0,
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
    builder.limit = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockResolvedValue(singleResult);
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

describe('BuildingDetails Rating', () => {
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

  it('rates the building via the sidebar MichelinRatingInput and saves it to Supabase', async () => {
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

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /visited/i })).toBeTruthy();
    });

    // The sidebar "My Rating" control is now a discrete four-tier radiogroup
    // (PersonalRatingButton variant="inline" -> MichelinRatingInput) rather
    // than the old hand-rolled hover-fill circle picker.
    const group = screen.getByRole("radiogroup", { name: /award rating/i });
    expect(group).toBeTruthy();

    const impressive = screen.getByRole("radio", { name: /impressive/i });
    fireEvent.click(impressive);

    // Verify Supabase upsert call — mirrors the assertion pattern used in
    // BuildingDetails.test.tsx's status-change test.
    await waitFor(() => {
        expect(mocks.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-123',
                building_id: 'b1',
                status: 'visited',
                rating: 1,
            }),
            expect.anything(),
        );
    });
  });
});
