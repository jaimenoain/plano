// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within } from '@testing-library/react';
import Profile from './Profile';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock IntersectionObserver. Must be a real constructor so `new
// IntersectionObserver(...)` works under Vitest v4 (an arrow-function
// mockImplementation is not construct-callable there).
window.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
  this.observe = () => null;
  this.unobserve = () => null;
  this.disconnect = () => null;
}) as unknown as typeof IntersectionObserver;

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    toast: vi.fn(),
    /** Stable reference — Profile’s fetch effect depends on `currentUser` identity. */
    authUser: { id: 'user-123', email: 'test@example.com' },
    loaderProfile: {
      id: 'user-123',
      username: 'testuser',
      avatar_url: null as string | null,
      bio: 'Bio',
    },
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ username: 'testuser' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useLoaderData: () => ({ profile: mocks.loaderProfile }),
  };
});

vi.mock('@/features/credits/api/people', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/credits/api/people')>();
  return {
    ...actual,
    getClaimedPersonSummaryForProfile: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.authUser,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/features/profile/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png' },
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/profile/components/UserCard', () => ({
  UserCard: ({ onSignOut }: { onSignOut: () => void }) => (
    <div data-testid="user-card">
      <button onClick={onSignOut}>Mock Sign Out</button>
    </div>
  ),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/profile/hooks/useProfileComparison', () => ({
  useProfileComparison: () => ({
    profileComparison: {
      mutualAffinityUsers: [],
      commonFollowers: [],
    },
  }),
}));

vi.mock('@/components/ui/sidebar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/sidebar')>();
  return {
    ...actual,
    useSidebar: () => ({
      state: "expanded" as const,
      open: true,
      setOpen: vi.fn(),
      openMobile: false,
      setOpenMobile: vi.fn(),
      toggleSidebar: vi.fn(),
      isMobile: false,
    }),
  };
});

// Supabase Mock
vi.mock('@/integrations/supabase/client', () => {
  // Content loads via user_buildings (status/rating) → building_posts (reviews)
  // → buildings. Mock each table to match that flow so review "review-1" renders.
  const userBuildingsData = [
    { building_id: 'b1', rating: 4, status: 'visited' },
  ];

  const buildingPostsData = [
    {
      id: 'review-1',
      body: 'Great place',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      user_id: 'user-123',
      building_id: 'b1',
      building: {
        id: 'b1',
        name: 'Test Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        hero_image_url: 'img.jpg',
        community_preview_url: null,
        slug: 'test-building',
        short_id: 1,
        building_credits: [
          { status: 'active', credit_tier: 'primary', person: { id: 'a1', name: 'Arch One' }, company: null },
        ],
      },
    },
  ];

  const profileData = { id: 'user-123', username: 'testuser', avatar_url: null, bio: 'Bio', favorites: [] };

  const reviewImagesData = [
      { id: 'img1', review_id: 'review-1', storage_path: 'path1', likes_count: 5 },
      { id: 'img2', review_id: 'review-1', storage_path: 'path2', likes_count: 3 }
  ];

  const likesData = [
      { interaction_id: 'review-1' } // 1 like for the review
  ];

  const createQueryBuilder = (table: string) => {
    let result: any = { data: [], error: null };

    if (table === 'profiles') {
       result = { data: profileData, error: null };
    } else if (table === 'user_buildings') {
       result = { data: userBuildingsData, error: null };
    } else if (table === 'building_posts') {
       result = { data: buildingPostsData, error: null };
    } else if (table === 'review_images') {
        result = { data: reviewImagesData, error: null };
    } else if (table === 'likes') {
        result = { data: likesData, error: null };
    }

    const builder: any = {
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    };

    builder.select = vi.fn().mockImplementation((cols, opts) => {
        if (opts && opts.count) {
          const resolved = { count: 0, data: null };
          const chain: { eq: ReturnType<typeof vi.fn>; then: typeof Promise.prototype.then } = {
            eq: vi.fn(),
            then: (onFulfilled, onRejected) =>
              Promise.resolve(resolved).then(onFulfilled, onRejected),
          };
          chain.eq.mockImplementation(() => chain);
          return chain;
        }
        return builder;
    });

    builder.eq = vi.fn().mockReturnThis();
    builder.ilike = vi.fn().mockReturnThis();
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.range = vi.fn().mockReturnThis();
    builder.limit = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockImplementation(() => {
      if (table === 'profiles') return Promise.resolve({ data: profileData, error: null });
      if (table === 'follows') return Promise.resolve({ data: null, error: null });
      return Promise.resolve(result);
    });

    // Mock delete and insert for interactions
    builder.delete = vi.fn().mockReturnThis();
    builder.insert = vi.fn().mockReturnThis();

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

describe('Profile Likes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('calculates total likes as sum of review likes and image likes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={["/profile/testuser"]}>
            <Routes>
              <Route
                path="/profile/:username"
                element={
                  <SidebarProvider>
                    <Profile />
                  </SidebarProvider>
                }
              />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('review-card-review-1')).toBeTruthy();
    });

    const listRadio = await screen.findByRole('radio', { name: 'List' });
    fireEvent.click(listRadio);

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText('Test Building')).toBeTruthy();
    });
    // 9 = 1 review like + 5 + 3 image likes (aggregated in fetchUserContent)
    expect(within(table).getByText('9', { exact: true })).toBeTruthy();
  });
});
