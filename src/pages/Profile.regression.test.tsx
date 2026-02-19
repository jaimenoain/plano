// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Profile from './Profile';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
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
      window.history.pushState({}, 'Test page', url);
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

  it('should render items in Grid view by default', async () => {
     renderProfileWithUrl();

     await screen.findByTestId('review-card-review-1');
     expect(screen.getByText('Empire State')).toBeTruthy();
     expect(screen.getByText('Chrysler Building')).toBeTruthy();
     expect(screen.getByText('Burj Khalifa')).toBeTruthy();
  });

  it('should filter items by Search Query in Grid View', async () => {
      renderProfileWithUrl('/profile/testuser?search=Empire');

      await screen.findByTestId('review-card-review-1');
      expect(screen.getByText('Empire State')).toBeTruthy();
      expect(screen.queryByText('Chrysler Building')).toBeNull();
  });

  it('should switch to Kanban view and render columns with correct data', async () => {
      renderProfileWithUrl('/profile/testuser');
      await screen.findByTestId('review-card-review-1');

      // Use label or some identifier for the toggle
      // In Profile.tsx: aria-label="Kanban View"
      const kanbanToggle = screen.getByLabelText('Kanban View');
      fireEvent.click(kanbanToggle);

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

      const kanbanToggle = screen.getByLabelText('Kanban View');
      fireEvent.click(kanbanToggle);

      await screen.findByTestId('kanban-view');

      expect(screen.getByText('Empire State')).toBeTruthy();
      expect(screen.queryByText('Chrysler Building')).toBeNull();
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
});
