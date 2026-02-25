// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BuildingPopupContent } from './BuildingPopupContent';
import { ClusterResponse } from '../hooks/useMapData';
import * as React from 'react';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Hoisted mocks for useAuth
const { mockUseAuth } = vi.hoisted(() => {
  return { mockUseAuth: vi.fn() };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

// Hoisted mocks for Supabase
const mocks = vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockMatch = vi.fn();
    const mockUpsert = vi.fn();
    const mockUpdate = vi.fn();

    // Define the chain object for select
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSelectChain: any = {
        single: mockSingle
    };
    // Add eq method that returns the chain itself
    const mockEq = vi.fn().mockReturnValue(mockSelectChain);
    mockSelectChain.eq = mockEq;

    const mockDeleteChain = {
        match: mockMatch
    };

    // Update chain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUpdateChain: any = {};
    const mockUpdateEq = vi.fn().mockReturnValue(mockUpdateChain);
    mockUpdateChain.eq = mockUpdateEq;

    return {
        mockSupabaseHandlers: {
            mockSingle,
            mockEq,
            mockMatch,
            mockUpsert,
            mockUpdate,
            mockUpdateEq,
            mockSelectChain,
            mockDeleteChain,
            mockUpdateChain
        }
    };
});

const { mockUseUserBuildingStatuses } = vi.hoisted(() => {
  return { mockUseUserBuildingStatuses: vi.fn() };
});

vi.mock('@/hooks/useUserBuildingStatuses', () => ({
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
          select: () => mocks.mockSupabaseHandlers.mockSelectChain,
          update: mocks.mockSupabaseHandlers.mockUpdate
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

describe('BuildingPopupContent Rating UI', () => {
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

  const { mockUpsert, mockMatch, mockSingle, mockEq, mockUpdate, mockUpdateEq, mockUpdateChain } = mocks.mockSupabaseHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'test-user-id' } });
    mockUpsert.mockResolvedValue({ error: null });
    mockMatch.mockResolvedValue({ error: null });

    // Setup update chain to be thenable
    mockUpdate.mockReturnValue(mockUpdateChain);
    // Ensure eq returns the chain
    mockUpdateEq.mockReturnValue(mockUpdateChain);

    // Make the chain awaitable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockUpdateChain as any).then = (resolve: any) => resolve({ error: null });

    // Ensure select chain is preserved/restored
    mockEq.mockReturnValue(mocks.mockSupabaseHandlers.mockSelectChain);

    // Default: No content
    mockSingle.mockResolvedValue({ data: { content: null, review_images: [] }, error: null });

    // Default statuses (Nothing)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: {}, ratings: {} });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows rating circles after saving a building', async () => {
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalled();
    });

    // Check if circles appear
    // The container with interaction UI should be present
    await waitFor(() => {
        const ratingContainer = document.querySelector('.animate-in');
        expect(ratingContainer).not.toBeNull();
        // Should have 4 children (1 status + 3 ratings)
        expect(ratingContainer?.children.length).toBe(4);
    });
  });

  it('calls handleRate when a rating circle is clicked', async () => {
    render(<BuildingPopupContent cluster={mockCluster} />);

    // Click Save to show circles
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalled();
    });

    let ratingContainer: Element | null = null;
    await waitFor(() => {
        ratingContainer = document.querySelector('.animate-in');
        expect(ratingContainer).not.toBeNull();
    });

    // Click the last rating circle (Rating 3)
    // children[0] is status, children[1] is rating 1, children[2] is rating 2, children[3] is rating 3
    const rating3 = ratingContainer?.children[3];
    if (rating3) {
        fireEvent.click(rating3);
    } else {
        throw new Error("Rating circle not found");
    }

    await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ rating: 3 });
        // Verify eq calls: user_id and building_id (via chain)
        expect(mockUpdateEq).toHaveBeenCalledTimes(2);
    });
  });
});
