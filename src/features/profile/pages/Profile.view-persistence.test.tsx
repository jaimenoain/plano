// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { handleDragEndLogic } from '@/utils/kanbanLogic';

// --- Global Mock State ---
let mockIsVisible = false;

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

// --- Mocks ---
const mocks = vi.hoisted(() => {
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
    getClaimedPersonSummaryForProfile: vi.fn().mockResolvedValue(null),
  };
});

const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    containerRef: { current: null },
    isVisible: mockIsVisible,
  }),
}));

// Mock DnD Kit to simulate drag end
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({ children, onDragEnd }: any) => (
            <div data-testid="dnd-context">
                <button data-testid="trigger-drag-end" onClick={() => onDragEnd({ active: { id: 'review-1' }, over: { id: '3-points' } })}>
                    Trigger Drag End
                </button>
                {children}
            </div>
        ),
        DragOverlay: ({ children }: any) => <div>{children}</div>, // Render children to avoid errors
        useSensor: vi.fn(),
        useSensors: vi.fn(),
        MouseSensor: vi.fn(),
        TouchSensor: vi.fn(),
        KeyboardSensor: vi.fn(),
    };
});

// Mock Kanban Logic
vi.mock('@/utils/kanbanLogic', () => ({
    handleDragEndLogic: vi.fn(),
}));


// Mock sub-components
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
             {/* Render simplified content for verification */}
             {kanbanData.saved.map((i: any) => <div key={i.id} data-testid={`kanban-item-${i.id}`}>{i.building.name}</div>)}
             {kanbanData.onePoint.map((i: any) => <div key={i.id} data-testid={`kanban-item-${i.id}`}>{i.building.name}</div>)}
             {kanbanData.twoPoints.map((i: any) => <div key={i.id} data-testid={`kanban-item-${i.id}`}>{i.building.name}</div>)}
             {kanbanData.threePoints.map((i: any) => <div key={i.id} data-testid={`kanban-item-${i.id}`}>{i.building.name}</div>)}
        </div>
    )
}));

vi.mock('@/features/profile/components/ProfileListView', () => ({
    ProfileListView: ({ data }: any) => (
        <div data-testid="list-view">
            {data.map((i: any) => <div key={i.id} data-testid={`list-item-${i.id}`}>{i.building.name}</div>)}
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
const mockBuildings = [
    {
        id: 'review-1',
        content: 'Great place',
        rating: 3,
        status: 'visited',
        created_at: '2023-01-01',
        edited_at: '2023-01-02',
        building: { id: 'b1', name: 'Empire State', address: 'NYC' }
    },
    {
        id: 'review-2',
        content: 'Nice view',
        rating: 2,
        status: 'visited',
        created_at: '2023-01-03',
        edited_at: '2023-01-04',
        building: { id: 'b2', name: 'Chrysler Building', address: 'NYC' }
    },
    {
        id: 'review-3',
        content: '',
        rating: null,
        status: 'pending',
        created_at: '2023-01-05',
        edited_at: null,
        building: { id: 'b3', name: 'Burj Khalifa', address: 'Dubai' }
    }
];

describe('Profile Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockIsVisible = false; // Reset intersection observer state
    queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    // Reset default behaviors
    mocks.mockChain.maybeSingle.mockResolvedValue({
        data: { id: 'user-123', username: 'testuser', avatar_url: null, bio: 'Test Bio' }
    });

    mocks.mockChain.then = (resolve: any) => resolve({ data: mockBuildings, error: null });
    mocks.mockSupabase.from.mockReturnValue(mocks.mockChain);
  });

  afterEach(() => {
    cleanup();
  });

  const profileTree = () => (
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
  );

  const renderProfile = () => {
    return render(<QueryClientProvider client={queryClient}>{profileTree()}</QueryClientProvider>);
  };

  it('should maintain search query when switching views', async () => {
    renderProfile();
    await screen.findByTestId('review-card-review-1');

    // 1. Enter search query
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Empire' } });

    // Check Grid filtered (building name appears twice in EditorialBuildingCard: alt + title)
    expect(screen.getByTestId('review-card-review-1')).toHaveTextContent('Empire State');
    expect(screen.queryByTestId('review-card-review-2')).toBeNull();

    // 2. Switch to Kanban
    fireEvent.click(screen.getByRole('radio', { name: 'Kanban' }));
    await screen.findByTestId('kanban-view');

    // Check Kanban filtered
    expect(screen.getByTestId('kanban-item-review-1')).toBeTruthy();
    expect(screen.queryByTestId('kanban-item-review-2')).toBeNull(); // Chrysler

    // 3. Switch to List
    fireEvent.click(screen.getByRole('radio', { name: 'List' }));
    await screen.findByTestId('list-view');

    // Check List filtered
    expect(screen.getByTestId('list-item-review-1')).toBeTruthy();
    expect(screen.queryByTestId('list-item-review-2')).toBeNull();
  });

  it('should maintain filter tab when switching views', async () => {
    renderProfile();
    await screen.findByTestId('review-card-review-1');

    // 1. Saved tab (pending / bucket list)
    fireEvent.click(screen.getByRole('button', { name: /Saved/i }));

    await waitFor(() => {
        expect(mocks.mockChain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    // 2. Switch to Kanban
    fireEvent.click(screen.getByRole('radio', { name: 'Kanban' }));
    await screen.findByTestId('kanban-view');

    // 3. Collections uses activeFilter "all" → .in('visited','pending')
    fireEvent.click(screen.getByRole('button', { name: /Collections/i }));

    await waitFor(() => {
         expect(mocks.mockChain.in).toHaveBeenCalledWith('status', ['visited', 'pending']);
    });
  });

  it('should trigger pagination when scrolled to bottom', async () => {
      // Pagination is now client-side over the deduplicated post IDs
      // (uniqueLatestPostIds.slice(page*15, +15)), keyed by building_id — not a
      // Supabase .range() call. Provide >15 DISTINCT buildings so page 0 sets
      // hasMore=true and a scroll fetches page 1 (post IDs review-15…review-19).
      const manyItems = Array(20).fill(mockBuildings[0]).map((b, i) => ({
          ...b,
          id: `review-${i}`,
          building_id: `b${i}`,
          building: { ...b.building, id: `b${i}` },
      }));
      mocks.mockChain.then = (resolve: any) => resolve({ data: manyItems, error: null });

      const { rerender } = renderProfile();
      await screen.findByTestId('review-card-review-0');

      // Verify initial fetch reads the user's buildings, and page 0 requests the
      // first 15 post IDs (review-0…review-14) via building_posts .in('id', …) —
      // review-15 is NOT yet fetched.
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('user_buildings');
      const fetchedPage2Posts = () =>
          mocks.mockChain.in.mock.calls.some(
              ([col, ids]) =>
                  col === 'id' && Array.isArray(ids) && ids.includes('review-15'),
          );
      expect(fetchedPage2Posts()).toBe(false);

      // Simulate Scroll to bottom (Intersection Observer visible)
      mockIsVisible = true;
      rerender(<QueryClientProvider client={queryClient}>{profileTree()}</QueryClientProvider>);

      // Page 1 fetches the next slice of post IDs (review-15…review-19).
      await waitFor(() => {
          expect(fetchedPage2Posts()).toBe(true);
      });
  });

  it('should trigger drag end logic when item is dropped in Kanban view', async () => {
      renderProfile();
      await screen.findByTestId('review-card-review-1');

      // Switch to Kanban
      fireEvent.click(screen.getByRole('radio', { name: 'Kanban' }));
      await screen.findByTestId('kanban-view');

      const triggers = screen.getAllByTestId('trigger-drag-end');
      fireEvent.click(triggers[0]);

      await waitFor(() => {
          expect(handleDragEndLogic).toHaveBeenCalledWith(expect.objectContaining({
              activeId: 'review-1',
              overId: '3-points'
          }));
      });
  });
});
