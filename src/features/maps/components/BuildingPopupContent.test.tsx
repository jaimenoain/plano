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

// Hoist the mock function so it's available in the factory
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

const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockMatch = vi.fn();

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      // Return mocked functions for 'user_buildings'
      if (table === 'user_buildings') {
        return {
          upsert: mockUpsert,
          delete: mockDelete,
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
    id: 123, // Note: ID is number in interface usually, but handled as string in component
    slug: 'test-building',
    name: 'Test Building',
    lat: 0,
    lng: 0,
    count: 1,
    is_cluster: false,
    image_url: 'test.jpg',
    rating: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    // mockDelete needs to return an object with match method
    mockDelete.mockReturnValue({ match: mockMatch });
    mockMatch.mockResolvedValue({ error: null });

    // Default statuses (Saved/pending)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });

    // Default window.open mock
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens new tab on card click', () => {
    render(<BuildingPopupContent cluster={mockCluster} />);
    // The main container has the onClick.
    // We can find it by finding the parent of the name or image.
    const nameElement = screen.getByText('Test Building');
    // Clicking the name propagates to the container
    fireEvent.click(nameElement);

    expect(window.open).toHaveBeenCalledWith('/building/test-building', '_blank');
  });

  it('toggles off (deletes) when clicking Save on a saved building', async () => {
    // Current status is 'pending' (Saved)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
        expect(mockMatch).toHaveBeenCalledWith({ user_id: 'test-user-id', building_id: '123' });
        expect(mockUpsert).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Removed from your list' }));
    });

    // Critical: Ensure navigation did not happen
    expect(window.open).not.toHaveBeenCalled();
  });

  it('toggles on (upserts) when clicking Visit on a saved building (switching status)', async () => {
    // Current status is 'pending'. Clicking Visit should upsert 'visited'.
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const visitButton = screen.getByTitle('Mark as visited');
    fireEvent.click(visitButton);

    await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'visited',
            user_id: 'test-user-id',
            building_id: '123'
        }), expect.anything());
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Marked as visited' }));
    });
  });

  it('toggles on (upserts) when clicking Save on a generic building', async () => {
    // Status is undefined (not in map)
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: {} });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'pending',
            user_id: 'test-user-id',
            building_id: '123'
        }), expect.anything());
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Saved to your list' }));
    });
  });

  it('toggles off (hides) when clicking Hide on a building', async () => {
    // Current status is 'pending'. Clicking Hide should upsert 'ignored'.
    mockUseUserBuildingStatuses.mockReturnValue({ statuses: { '123': 'pending' } });
    render(<BuildingPopupContent cluster={mockCluster} />);

    const hideButton = screen.getByTitle('Hide');
    fireEvent.click(hideButton);

    await waitFor(() => {
        expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'ignored',
            user_id: 'test-user-id',
            building_id: '123'
        }), expect.anything());
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Building hidden' }));
    });

    // Critical: Ensure navigation did not happen
    expect(window.open).not.toHaveBeenCalled();
  });
});
