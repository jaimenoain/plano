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

const mockUser = { id: 'test-user-id' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Hoisted mocks for Supabase
const mocks = vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockMatch = vi.fn();
    const mockUpsert = vi.fn();

    // Define the chain object
    const mockSelectChain: any = {
        single: mockSingle
    };
    // Add eq method that returns the chain itself
    const mockEq = vi.fn().mockReturnValue(mockSelectChain);
    mockSelectChain.eq = mockEq;

    const mockDeleteChain = {
        match: mockMatch
    };

    return {
        mockSupabaseHandlers: {
            mockSingle,
            mockEq,
            mockMatch,
            mockUpsert,
            mockSelectChain,
            mockDeleteChain
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
          select: () => mocks.mockSupabaseHandlers.mockSelectChain
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

  const { mockUpsert, mockMatch, mockSingle, mockEq, mockSelectChain } = mocks.mockSupabaseHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockMatch.mockResolvedValue({ error: null });

    // Ensure chain is preserved/restored
    mockEq.mockReturnValue(mockSelectChain);

    // Default: No content
    mockSingle.mockResolvedValue({ data: { content: null, review_images: [] }, error: null });

    // Default statuses (Saved/pending)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('verifies mock chain structure', () => {
      expect(mockSelectChain).toBeDefined();
      expect(mockSelectChain.eq).toBeDefined();
      expect(mockSelectChain.single).toBeDefined();
      expect(mockEq).toBeDefined();

      // Test chaining
      const chained = mockSelectChain.eq('test', 'value');
      expect(chained).toBe(mockSelectChain);

      const chained2 = chained.eq('another', 'value');
      expect(chained2).toBe(mockSelectChain);
  });

  it('shows generic confirmation when unsaving a building without content', async () => {
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // Verify eq is called
    await waitFor(() => {
        expect(mockEq).toHaveBeenCalledTimes(2);
    });

    // Verify single is called
    expect(mockSingle).toHaveBeenCalled();

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

    // Use implementation to be sure
    mockSingle.mockImplementation(async () => ({
        data: { content: "Great building", review_images: [{ count: 2 }] },
        error: null
    }));

    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    // Verify call
    await waitFor(() => {
        expect(mockSingle).toHaveBeenCalled();
    });

    await waitFor(() => {
        expect(screen.getByText("Delete building data?")).toBeTruthy();
        expect(screen.getByText(/permanently delete your review and 2 attached photos/)).toBeTruthy();
    });
  });
});
