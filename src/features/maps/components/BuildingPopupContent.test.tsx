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

// Hoisted mocks for Supabase
const mocks = vi.hoisted(() => {
    const mockMatch = vi.fn();
    const mockUpsert = vi.fn();

    // building_posts: .select('id, body').eq(...).eq(...) resolves to { data: [...] }
    // The chain is thenable so `await ...eq().eq()` resolves to postsResult.
    const postsResult: { current: any } = { current: { data: [], error: null } };
    const postsChain: any = {};
    const mockPostsEq = vi.fn().mockReturnValue(postsChain);
    postsChain.eq = mockPostsEq;
    postsChain.then = (resolve: (v: any) => void) => resolve(postsResult.current);

    // review_images: .select('id', { count }).in(...) resolves to { count }
    const imagesResult: { current: any } = { current: { count: 0, error: null } };
    const mockIn = vi.fn().mockResolvedValue(undefined);

    const mockDeleteChain = {
        match: mockMatch
    };

    return {
        mockSupabaseHandlers: {
            mockPostsEq,
            mockIn,
            mockMatch,
            mockUpsert,
            postsChain,
            postsResult,
            imagesResult,
            mockDeleteChain
        }
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
      if (table === 'user_buildings') {
        return {
          upsert: mocks.mockSupabaseHandlers.mockUpsert,
          delete: () => mocks.mockSupabaseHandlers.mockDeleteChain,
        };
      }
      if (table === 'building_posts') {
        return {
          select: () => mocks.mockSupabaseHandlers.postsChain,
        };
      }
      if (table === 'review_images') {
        return {
          select: () => ({
            in: (...args: unknown[]) => {
              mocks.mockSupabaseHandlers.mockIn(...args);
              return Promise.resolve(mocks.mockSupabaseHandlers.imagesResult.current);
            },
          }),
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

  const { mockUpsert, mockMatch, mockPostsEq, mockIn, postsChain, postsResult, imagesResult } =
    mocks.mockSupabaseHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'test-user-id' } });
    mockUpsert.mockResolvedValue({ error: null });
    mockMatch.mockResolvedValue({ error: null });

    // Ensure chain is preserved/restored after clearAllMocks
    mockPostsEq.mockReturnValue(postsChain);

    // Default: no review posts and no images
    postsResult.current = { data: [], error: null };
    imagesResult.current = { count: 0, error: null };

    // Default statuses (Saved/pending). Hook also reads ratings.
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' }, ratings: {} });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('verifies mock chain structure', () => {
      expect(postsChain).toBeDefined();
      expect(postsChain.eq).toBeDefined();
      expect(mockPostsEq).toBeDefined();

      // Test chaining: .eq() returns the chain itself so it can be called twice
      const chained = postsChain.eq('test', 'value');
      expect(chained).toBe(postsChain);

      const chained2 = chained.eq('another', 'value');
      expect(chained2).toBe(postsChain);
  });

  it('shows generic confirmation when unsaving a building without content', async () => {
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' }, ratings: {} });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // Verify building_posts is queried by user_id then building_id (two .eq calls)
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
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' }, ratings: {} });

    // A review post exists (non-empty body) with 2 attached photos.
    postsResult.current = { data: [{ id: 'post-1', body: 'Great building' }], error: null };
    imagesResult.current = { count: 2, error: null };

    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // Verify review_images is queried with the post ids
    await waitFor(() => {
        expect(mockIn).toHaveBeenCalledWith('review_id', ['post-1']);
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
