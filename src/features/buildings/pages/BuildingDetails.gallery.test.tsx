// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
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
    user: { id: 'user-123', email: 'test@example.com' },
    getBuildingReviews: vi.fn(),
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
  const createQueryBuilder = (table: string) => {
    const listResult: any = { data: [], error: null };
    const singleResult: any = { data: null, error: null };

    // Default mocks for queries
    const builder: any = {
        then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject)
    };

    builder.select = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockReturnThis();
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockResolvedValue(singleResult);
    builder.single = vi.fn().mockResolvedValue(singleResult);
    builder.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.delete = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.update = vi.fn().mockResolvedValue({ data: null, error: null });

    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
      rpc: (fnName: string, args: any) => {
          if (fnName === 'get_building_reviews') {
              return mocks.getBuildingReviews(args);
          }
          return Promise.resolve({ data: [], error: null });
      },
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

// We want to test Tabs behavior, so we shouldn't mock BuildingImageCard fully away,
// or at least ensure it renders something identifiable.
vi.mock('@/features/buildings/components/BuildingImageCard', () => ({
  BuildingImageCard: ({ image }: { image: any }) => (
    <div data-testid={`image-card-${image.id}`}>
        Image {image.id} {image.is_official ? '(Official)' : '(Community)'}
    </div>
  )
}));

describe('BuildingDetails Gallery', () => {
  const queryClient = new QueryClient({
      defaultOptions: {
          queries: {
              retry: false,
          },
      },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBuildingReviews.mockReset();

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

    mocks.getBuildingReviews.mockResolvedValue({
      data: [
        {
          id: "review-1",
          user_id: "u1",
          content: "Review 1",
          rating: 5,
          created_at: "2023-01-01",
          user_data: { username: "user1", avatar_url: null },
          images: [
            { id: "img-1", storage_path: "path1.jpg", is_official: false, likes_count: 0 },
            { id: "img-2", storage_path: "path2.jpg", is_official: true, likes_count: 10 },
          ],
        },
        {
          id: "review-2",
          user_id: "u2",
          content: "Review 2",
          rating: 4,
          created_at: "2023-01-02",
          user_data: { username: "user2", avatar_url: null },
          images: [{ id: "img-3", storage_path: "path3.jpg", is_official: false, likes_count: 5 }],
        },
      ],
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it(
    "renders Photos section after load",
    async () => {
      render(
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <SidebarProvider>
                <BuildingDetails />
              </SidebarProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </TooltipProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText("Test Building").length).toBeGreaterThan(0);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/Reviews & photography/)).toBeTruthy();
        },
        { timeout: 10_000 },
      );
    },
    15_000,
  );
});
