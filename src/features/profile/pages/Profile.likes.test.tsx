// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Profile from './Profile';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';

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
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ username: 'testuser' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/components/profile/UserCard', () => ({
  UserCard: ({ onSignOut }: { onSignOut: () => void }) => (
    <div data-testid="user-card">
      <button onClick={onSignOut}>Mock Sign Out</button>
    </div>
  ),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useProfileComparison', () => ({
  useProfileComparison: () => ({
    profileComparison: {
      mutualAffinityUsers: [],
      commonFollowers: [],
    },
  }),
}));

// Supabase Mock
vi.mock('@/integrations/supabase/client', () => {
  const userBuildingsData = [
    {
      id: 'review-1',
      content: 'Great place',
      rating: 4,
      created_at: '2023-01-01',
      edited_at: '2023-01-01',
      user_id: 'user-123',
      building_id: 'b1',
      status: 'visited',
      building: {
        id: 'b1',
        name: 'Test Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        main_image_url: 'img.jpg',
        slug: 'test-building',
        short_id: 'tb',
        architects: [{ architect: { name: 'Arch One', id: 'a1' } }]
      }
    }
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
             return {
                 eq: () => ({
                     eq: () => Promise.resolve({ count: 5, data: null })
                 })
             };
        }
        return builder;
    });

    builder.eq = vi.fn().mockReturnThis();
    builder.ilike = vi.fn().mockReturnThis();
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.range = vi.fn().mockReturnThis();
    builder.limit = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockResolvedValue(result);

    // Mock delete and insert for interactions
    builder.delete = vi.fn().mockReturnThis();
    builder.insert = vi.fn().mockReturnThis();

    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
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
    render(
      <HelmetProvider>
        <TooltipProvider>
            <BrowserRouter>
            <SidebarProvider>
                <Profile />
            </SidebarProvider>
            </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    );

    // Wait for content to load
    await waitFor(() => {
        expect(screen.getByTestId('user-card')).toBeTruthy();
    });

    // We expect "9" likes (1 review + 5 img1 + 3 img2)
    // If the fix is NOT implemented, it will likely show "1" (just review likes) or "0".

    await waitFor(() => {
        // We look for text "9" specifically.
        // We can be looser and check that it is NOT "1".
        const likesCount = screen.queryByText('9');
        if (!likesCount) {
             // If we don't find 9, let's see what we find to debug (if we were debugging manually)
             // But for the test, we just assert it exists.
             throw new Error('Expected to find like count "9"');
        }
    });
  });
});
