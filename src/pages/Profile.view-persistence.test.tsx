// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { handleDragEndLogic } from '@/utils/kanbanLogic';

// --- Global Mock State ---
let mockIsVisible = false;

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
      storage: { from: vi.fn().mockReturnValue({ getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }) }) },
  };

  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    mockSupabase,
    mockChain
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ username: 'testuser' }),
  };
});

const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useAuth', () => ({
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
vi.mock('@/components/profile/UserCard', () => ({
    UserCard: () => <div data-testid="user-card">User Card</div>
}));

vi.mock('@/components/profile/SocialContextSection', () => ({
    SocialContextSection: () => <div data-testid="social-context">Social Context</div>
}));

vi.mock('@/components/profile/FavoritesSection', () => ({
    FavoritesSection: () => <div data-testid="favorites-section">Favorites</div>
}));

vi.mock('@/components/profile/ProfileHighlights', () => ({
    ProfileHighlights: () => <div data-testid="profile-highlights">Highlights</div>
}));

vi.mock('@/components/profile/ProfileKanbanView', () => ({
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

vi.mock('@/components/profile/ProfileListView', () => ({
    ProfileListView: ({ data }: any) => (
        <div data-testid="list-view">
            {data.map((i: any) => <div key={i.id} data-testid={`list-item-${i.id}`}>{i.building.name}</div>)}
        </div>
    )
}));

vi.mock('@/components/profile/CollectionsGrid', () => ({
    CollectionsGrid: () => <div data-testid="collections-grid">Collections</div>
}));

vi.mock('@/components/profile/FavoriteCollectionsGrid', () => ({
    FavoriteCollectionsGrid: () => <div data-testid="fav-collections-grid">Fav Collections</div>
}));

vi.mock('@/components/feed/ReviewCard', () => ({
    ReviewCard: ({ entry }: any) => (
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

  const renderProfile = () => {
       return render(
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <SidebarProvider>
                    <BrowserRouter>
                        <Profile />
                    </BrowserRouter>
                </SidebarProvider>
            </QueryClientProvider>
        </HelmetProvider>
      );
  };

  it('should maintain search query when switching views', async () => {
    renderProfile();
    await screen.findByTestId('review-card-review-1');

    // 1. Enter search query
    const searchInput = screen.getByPlaceholderText('Search reviews...');
    fireEvent.change(searchInput, { target: { value: 'Empire' } });

    // Check Grid filtered
    expect(screen.getByText('Empire State')).toBeTruthy();
    expect(screen.queryByText('Chrysler Building')).toBeNull();

    // 2. Switch to Kanban
    const kanbanToggle = screen.getByLabelText('Kanban View');
    fireEvent.click(kanbanToggle);
    await screen.findByTestId('kanban-view');

    // Check Kanban filtered
    expect(screen.getByTestId('kanban-item-review-1')).toBeTruthy();
    expect(screen.queryByTestId('kanban-item-review-2')).toBeNull(); // Chrysler

    // 3. Switch to List
    const listToggle = screen.getByLabelText('List View');
    fireEvent.click(listToggle);
    await screen.findByTestId('list-view');

    // Check List filtered
    expect(screen.getByTestId('list-item-review-1')).toBeTruthy();
    expect(screen.queryByTestId('list-item-review-2')).toBeNull();
  });

  it('should maintain filter tab when switching views', async () => {
    renderProfile();
    await screen.findByTestId('review-card-review-1');

    // 1. Select "Bucket List" (Pending)
    const bucketListTab = screen.getByText('Bucket List');
    fireEvent.click(bucketListTab);

    await waitFor(() => {
        expect(mocks.mockChain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    // 2. Switch to Kanban
    const kanbanToggle = screen.getByLabelText('Kanban View');
    fireEvent.click(kanbanToggle);
    await screen.findByTestId('kanban-view');

    // Switch back to 'All'
    const allTab = screen.getByText('All');
    fireEvent.click(allTab);

    await waitFor(() => {
         expect(mocks.mockChain.in).toHaveBeenCalledWith('status', ['visited', 'pending']);
    });
  });

  it('should trigger pagination when scrolled to bottom', async () => {
      // Mock return 15 items to trigger hasMore=true
      const manyItems = Array(15).fill(mockBuildings[0]).map((b, i) => ({ ...b, id: `review-${i}` }));
      mocks.mockChain.then = (resolve: any) => resolve({ data: manyItems, error: null });

      const { rerender } = renderProfile();
      await screen.findByTestId('review-card-review-0');

      // Verify initial fetch
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('user_buildings');
      expect(mocks.mockChain.range).toHaveBeenCalledWith(0, 14);

      // Simulate Scroll to bottom (Intersection Observer visible)
      mockIsVisible = true;
      rerender(
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <SidebarProvider>
                    <BrowserRouter>
                        <Profile />
                    </BrowserRouter>
                </SidebarProvider>
            </QueryClientProvider>
        </HelmetProvider>
      );

      await waitFor(() => {
          // Check if range(15, 29) was called
          expect(mocks.mockChain.range).toHaveBeenCalledWith(15, 29);
      });
  });

  it('should trigger drag end logic when item is dropped in Kanban view', async () => {
      renderProfile();
      await screen.findByTestId('review-card-review-1');

      // Switch to Kanban
      const kanbanToggle = screen.getByLabelText('Kanban View');
      fireEvent.click(kanbanToggle);
      await screen.findByTestId('kanban-view');

      // Trigger Drop (get the second trigger button, since first one is Collections section now)
      const triggers = screen.getAllByTestId('trigger-drag-end');
      fireEvent.click(triggers[1]);

      await waitFor(() => {
          expect(handleDragEndLogic).toHaveBeenCalledWith(expect.objectContaining({
              activeId: 'review-1',
              overId: '3-points'
          }));
      });
  });
});
