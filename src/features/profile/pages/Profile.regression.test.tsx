// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Profile from './Profile';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

// Mocks
const mocks = vi.hoisted(() => {
  const stableAuthUser = { id: 'user-123', email: 'test@example.com' };
  const mockChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      then: (resolve: any) => resolve({ data: [], error: null }),
  };

  const mockSupabase = {
      from: vi.fn().mockReturnValue(mockChain),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      storage: { from: vi.fn().mockReturnValue({ getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }) }) },
  };

  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    mockSupabase,
    mockChain,
    stableAuthUser,
    getClaimedPersonSummaryMock: vi.fn().mockResolvedValue(null),
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
    useLoaderData: () => ({ profile: mocks.loaderProfile }),
  };
});

vi.mock('@/features/credits/api/people', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/credits/api/people')>();
  return {
    ...actual,
    getClaimedPersonSummaryForProfile: (...args: unknown[]) =>
      mocks.getClaimedPersonSummaryMock(...args),
  };
});

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.stableAuthUser,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    containerRef: { current: null },
    isVisible: false,
  }),
}));

vi.mock('@/features/profile/components/UserCard', () => ({
    UserCard: () => <div data-testid="user-card">User Card</div>
}));

vi.mock('@/features/profile/components/SocialContextSection', () => ({
    SocialContextSection: () => <div data-testid="social-context">Social Context</div>
}));

vi.mock('@/features/profile/components/FavoritesSection', () => ({
    FavoritesSection: () => <div data-testid="favorites-section">Favorites</div>
}));

vi.mock('@/features/profile/components/ProfileHighlights', () => ({
    ProfileHighlights: () => <div data-testid="profile-highlights">Highlights</div>
}));

vi.mock('@/features/profile/components/ProfileKanbanView', () => ({
    ProfileKanbanView: ({ kanbanData }: any) => (
        <div data-testid="kanban-view">
            <div data-testid="col-saved">
                <h3>Saved</h3>
                {kanbanData.saved.map((i: any) => <div key={i.id}>{i.building.name}</div>)}
            </div>
            <div data-testid="col-1">
                <h3>1 Point</h3>
                {kanbanData.onePoint.map((i: any) => <div key={i.id}>{i.building.name}</div>)}
            </div>
            <div data-testid="col-2">
                <h3>2 Points</h3>
                {kanbanData.twoPoints.map((i: any) => <div key={i.id}>{i.building.name}</div>)}
            </div>
            <div data-testid="col-3">
                <h3>3 Points</h3>
                {kanbanData.threePoints.map((i: any) => <div key={i.id}>{i.building.name}</div>)}
            </div>
        </div>
    )
}));

vi.mock('@/features/collections/components/CollectionsGrid', () => ({
    CollectionsGrid: () => <div data-testid="collections-grid">Collections</div>
}));

vi.mock('@/features/profile/components/FavoriteCollectionsGrid', () => ({
    FavoriteCollectionsGrid: () => <div data-testid="fav-collections-grid">Fav Collections</div>
}));

vi.mock('@/features/profile/components/ProfileReviewCard', () => ({
    ProfileReviewCard: ({ entry }: any) => (
        <div data-testid={`review-card-${entry.id}`}>
            {entry.building.name}
        </div>
    )
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mocks.mockSupabase,
}));

// Mock building data
// Rows are shaped to satisfy both queries the Profile page now runs:
//   1. user_buildings → { building_id, rating, status }
//   2. building_posts → { id, building_id, building: { ... } }
// The single mockChain returns this same array for every table, so each row
// carries the union of the fields both queries read (building_id ties them
// together — that is how ratings/status flow into the kanban columns).
const mockBuildings = [
    {
        id: 'review-1',
        content: 'Great place',
        rating: 3,
        status: 'visited',
        created_at: '2023-01-01',
        edited_at: '2023-01-02',
        updated_at: '2023-01-02',
        building_id: 'b1',
        building: { id: 'b1', name: 'Empire State', address: 'NYC' }
    },
    {
        id: 'review-2',
        content: 'Nice view',
        rating: 2,
        status: 'visited',
        created_at: '2023-01-03',
        edited_at: '2023-01-04',
        updated_at: '2023-01-04',
        building_id: 'b2',
        building: { id: 'b2', name: 'Chrysler Building', address: 'NYC' }
    },
    {
        id: 'review-3',
        content: '',
        rating: null,
        status: 'pending',
        created_at: '2023-01-05',
        edited_at: null,
        updated_at: null,
        building_id: 'b3',
        building: { id: 'b3', name: 'Burj Khalifa', address: 'Dubai' }
    }
];

describe('Profile Regression Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    mocks.getClaimedPersonSummaryMock.mockReset();
    mocks.getClaimedPersonSummaryMock.mockResolvedValue(null);

    // Reset default behaviors
    mocks.mockChain.maybeSingle.mockResolvedValue({
        data: { id: 'user-123', username: 'testuser', avatar_url: null, bio: 'Test Bio' }
    });

    // We need to override 'then' for user_buildings query
    // Since 'then' is a property on the object, we can just assign it
    mocks.mockChain.then = (resolve: any) => resolve({ data: mockBuildings, error: null });

    // Ensure from returns the chain
    mocks.mockSupabase.from.mockReturnValue(mocks.mockChain);
  });

  afterEach(() => {
    cleanup();
  });

  const renderProfileWithUrl = (url: string = '/profile/testuser') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
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
      </QueryClientProvider>,
    );
  };

  it('should render items in Grid view by default', async () => {
     renderProfileWithUrl();

     await screen.findByTestId('review-card-review-1');
     expect(screen.getByTestId('review-card-review-1')).toHaveTextContent('Empire State');
     expect(screen.getByTestId('review-card-review-2')).toHaveTextContent('Chrysler Building');
     expect(screen.getByTestId('review-card-review-3')).toHaveTextContent('Burj Khalifa');
  });

  it('should filter items by Search Query in Grid View', async () => {
      renderProfileWithUrl('/profile/testuser?search=Empire');

      await screen.findByTestId('review-card-review-1');
      expect(screen.getByTestId('review-card-review-1')).toHaveTextContent('Empire State');
      expect(screen.queryByTestId('review-card-review-2')).toBeNull();
  });

  it('should switch to Kanban view and render columns with correct data', async () => {
      renderProfileWithUrl('/profile/testuser');
      await screen.findByTestId('review-card-review-1');

      fireEvent.click(screen.getByRole('radio', { name: 'Kanban' }));

      await screen.findByTestId('kanban-view');

      const col3 = screen.getByTestId('col-3');
      expect(col3.textContent).toContain('Empire State');

      const col2 = screen.getByTestId('col-2');
      expect(col2.textContent).toContain('Chrysler Building');

      const colSaved = screen.getByTestId('col-saved');
      expect(colSaved.textContent).toContain('Burj Khalifa');
  });

  it('should filter items by Search Query in Kanban View', async () => {
      renderProfileWithUrl('/profile/testuser?search=Empire');

      await screen.findByTestId('review-card-review-1');

      fireEvent.click(screen.getByRole('radio', { name: 'Kanban' }));

      await screen.findByTestId('kanban-view');

      await waitFor(() => {
        expect(screen.getByTestId('kanban-view').textContent).toContain('Empire');
      });
      expect(screen.getByTestId('kanban-view').textContent).not.toContain('Chrysler');
  });

  it('should switch to List view and render table', async () => {
      renderProfileWithUrl();
      await screen.findByTestId('review-card-review-1');

      fireEvent.click(await screen.findByRole('radio', { name: 'List' }));

      expect(await screen.findByText('Name')).toBeTruthy();
      expect(screen.getByText('Empire State')).toBeTruthy();
      expect(screen.getByText('Chrysler Building')).toBeTruthy();
  });

  it('should filter by Tab (Reviews vs Bucket List)', async () => {
      renderProfileWithUrl('/profile/testuser?tab=reviews');

      await waitFor(() => expect(mocks.mockSupabase.from).toHaveBeenCalledWith('user_buildings'));

      expect(mocks.mockChain.eq).toHaveBeenCalledWith('status', 'visited');
  });

  it('should filter by Tab (Bucket List)', async () => {
      renderProfileWithUrl('/profile/testuser?tab=bucket_list');

      await waitFor(() => expect(mocks.mockSupabase.from).toHaveBeenCalledWith('user_buildings'));

      expect(mocks.mockChain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('should not show portfolio dashboard link without a claimed person profile', async () => {
      renderProfileWithUrl();

      await screen.findByTestId('review-card-review-1');

      expect(screen.queryByRole('link', { name: /open portfolio dashboard/i })).toBeNull();
  });

  it('QA 3.2: shows Professional profile card with person link and credit count when linked', async () => {
    mocks.getClaimedPersonSummaryMock.mockResolvedValue({
      id: 'p1',
      name: 'Alex Architect',
      slug: 'alex-architect',
      creditCount: 12,
    });
    renderProfileWithUrl();
    await waitFor(
      () => {
        expect(screen.getByText('Professional profile')).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    expect(screen.getByRole('link', { name: 'Alex Architect' })).toHaveAttribute('href', '/person/alex-architect');
    expect(screen.getByText(/Credited on 12 buildings/)).toBeInTheDocument();
  });

  it('QA 3.2: hides Professional profile card when no linked person', async () => {
    mocks.getClaimedPersonSummaryMock.mockResolvedValue(null);
    renderProfileWithUrl();
    await screen.findByTestId('review-card-review-1');
    await waitFor(() => {
      expect(screen.queryByText('Professional profile')).not.toBeInTheDocument();
    });
  });
});
