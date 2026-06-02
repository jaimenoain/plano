// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BuildingPopupContent } from './BuildingPopupContent';
import { ClusterResponse } from '../hooks/useMapData';
import * as React from 'react';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Hoisted mocks for useAuth
const { mockUseAuth } = vi.hoisted(() => {
  return { mockUseAuth: vi.fn() };
});

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

// Hoisted mocks for Supabase.
//
// Content detection in handleAction now runs two queries instead of one
// user_buildings single-row select:
//   1. building_posts.select('id, body').eq(user).eq(building)   → { data: posts }
//   2. review_images.select('id', { count }).in('review_id', ids) → { count }
// and the toggle-off path deletes via user_buildings.delete().match(...).
const mocks = vi.hoisted(() => {
    // Per-test fixtures controlling what content detection "finds".
    const state = {
        posts: [] as Array<{ id: string; body: string | null }>,
        imageCount: 0,
    };

    // Spies we assert on.
    const mockPostsEq = vi.fn();      // building_posts .eq()
    const mockImagesIn = vi.fn();     // review_images .in()
    const mockMatch = vi.fn();        // user_buildings .delete().match()
    const mockUpsert = vi.fn();       // user_buildings .upsert()

    // building_posts: select(...).eq(...).eq(...) — chainable + awaitable.
    const postsChain: any = {
        then: (resolve: any, reject: any) =>
            Promise.resolve({ data: state.posts, error: null }).then(resolve, reject),
    };
    mockPostsEq.mockReturnValue(postsChain);
    postsChain.eq = mockPostsEq;

    // review_images: select(...).in(...) — awaitable, resolves a count.
    const imagesChain: any = {
        then: (resolve: any, reject: any) =>
            Promise.resolve({ count: state.imageCount, error: null }).then(resolve, reject),
    };
    mockImagesIn.mockReturnValue(imagesChain);
    imagesChain.in = mockImagesIn;

    const deleteChain = { match: mockMatch };

    return {
        mockSupabaseHandlers: {
            state,
            mockPostsEq,
            mockImagesIn,
            mockMatch,
            mockUpsert,
            postsChain,
            imagesChain,
            deleteChain,
        },
    };
});

const { mockUseUserBuildingStatuses } = vi.hoisted(() => {
  return { mockUseUserBuildingStatuses: vi.fn() };
});

vi.mock('@/features/profile/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: mockUseUserBuildingStatuses,
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const h = mocks.mockSupabaseHandlers;
      if (table === 'building_posts') {
        // .select(...).eq(...).eq(...) → resolves { data: posts }
        return { select: () => h.postsChain };
      }
      if (table === 'review_images') {
        // .select('id', { count }).in('review_id', ids) → resolves { count }
        return { select: () => h.imagesChain };
      }
      if (table === 'user_buildings') {
        return {
          upsert: h.mockUpsert,
          delete: () => h.deleteChain,
        };
      }
      return {};
    },
  },
}));

// Mock Image util
vi.mock('@/utils/image', () => ({
    getBuildingImageUrl: (url: string) => url,
}));

describe('BuildingPopupContent', () => {
  const mockCluster: ClusterResponse = {
    id: 123,
    slug: 'test-building',
    name: 'Test Building',
    lat: 0,
    lng: 0,
    count: 1,
    is_cluster: false,
    image_url: 'test.jpg',
    rating: 0,
  };

  const { state, mockUpsert, mockMatch, mockPostsEq, mockImagesIn } = mocks.mockSupabaseHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'test-user-id' } });
    mockUpsert.mockResolvedValue({ error: null });
    mockMatch.mockResolvedValue({ error: null });

    // Re-establish chain return values (clearAllMocks wipes mockReturnValue).
    mockPostsEq.mockReturnValue(mocks.mockSupabaseHandlers.postsChain);
    mockImagesIn.mockReturnValue(mocks.mockSupabaseHandlers.imagesChain);

    // Default: no content (no posts, no images).
    state.posts = [];
    state.imageCount = 0;

    // Default statuses (Saved/pending)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('verifies mock chain structure', () => {
      // building_posts: select(...).eq(...).eq(...) is chainable and awaitable.
      const postsChain = mocks.mockSupabaseHandlers.postsChain;
      expect(postsChain.eq).toBeDefined();
      expect(postsChain.eq('user_id', 'value')).toBe(postsChain);
      expect(postsChain.eq('user_id', 'a').eq('building_id', 'b')).toBe(postsChain);

      // review_images: select(...).in(...) is awaitable.
      const imagesChain = mocks.mockSupabaseHandlers.imagesChain;
      expect(imagesChain.in).toBeDefined();
      expect(imagesChain.in('review_id', [])).toBe(imagesChain);
  });

  it('shows generic confirmation when unsaving a building without content', async () => {
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
    // No posts, no images → generic confirmation.
    state.posts = [];
    state.imageCount = 0;
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // building_posts content query runs (two .eq filters: user_id + building_id).
    await waitFor(() => {
        expect(mockPostsEq).toHaveBeenCalledTimes(2);
    });

    // Wait for dialog
    await waitFor(() => {
        expect(screen.getByText("Remove from list?")).toBeTruthy();
        expect(screen.getByText("Are you sure you want to remove this building from your list?")).toBeTruthy();
    });

    // Confirm
    const confirmButton = screen.getByText("Confirm Delete");
    fireEvent.click(confirmButton);

    await waitFor(() => {
        expect(mockMatch).toHaveBeenCalledWith({ user_id: 'test-user-id', building_id: '123' });
    });
  });

  it('shows specific warning when unsaving a building with review and images', async () => {
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });

    // A post with a non-empty body → hasReview; review_images count = 2.
    state.posts = [{ id: 'post-1', body: 'Great building' }];
    state.imageCount = 2;

    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // Both content queries run: building_posts (two .eq filters) and the
    // review_images count query (.in('review_id', postIds)).
    await waitFor(() => {
        expect(mockPostsEq).toHaveBeenCalledTimes(2);
        expect(mockImagesIn).toHaveBeenCalled();
    });

    await waitFor(() => {
        expect(screen.getByText("Delete building data?")).toBeTruthy();
        expect(screen.getByText(/permanently delete your review and 2 attached photos/)).toBeTruthy();
    });
  });

  it('hides action buttons when user is not logged in', () => {
    // Override user for this test
    mockUseAuth.mockReturnValue({ user: null });

    render(<BuildingPopupContent cluster={mockCluster} />);

    // Buttons should NOT be present
    expect(screen.queryByTitle('Save')).toBeNull();
    expect(screen.queryByTitle('Mark as visited')).toBeNull();
    expect(screen.queryByTitle('Hide')).toBeNull();

    // The content itself should still be visible
    expect(screen.getByText('Test Building')).toBeTruthy();
  });

  describe('Custom Marker Logic', () => {
    const mockCustomMarker: ClusterResponse = {
      id: 123,
      slug: 'test-building',
      name: 'Test Building',
      lat: 0,
      lng: 0,
      count: 1,
      is_cluster: false,
      rating: 0,
      is_custom_marker: true,
      marker_category: 'other',
      image_url: 'test.jpg',
      image_attribution: ['<span>Attribution</span>']
    };

    it('shows "Remove Marker" button when onRemoveFromCollection is provided', () => {
      const onRemove = vi.fn();
      render(<BuildingPopupContent cluster={mockCustomMarker} onRemoveFromCollection={onRemove} />);

      const removeBtn = screen.getByText('Remove Marker');
      expect(removeBtn).toBeDefined();

      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith('123');
    });

    it('does NOT show "Remove Marker" button when onRemoveFromCollection is undefined', () => {
      render(<BuildingPopupContent cluster={mockCustomMarker} />); // onRemoveFromCollection is undefined

      const removeBtn = screen.queryByText('Remove Marker');
      expect(removeBtn).toBeNull();
    });

    it('does NOT show attribution overlay even if present in data', () => {
      render(<BuildingPopupContent cluster={mockCustomMarker} />);
      // The attribution text "Attribution" should not be visible
      expect(screen.queryByText('Attribution')).toBeNull();
    });
  });
});
