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
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders link overlay with correct attributes', () => {
    render(<BuildingPopupContent cluster={mockCluster} />);

    // Find the link. We can find it by its role and aria-label or just role if unique.
    const link = screen.getByRole('link', { name: /View details for Test Building/i });

    expect(link.getAttribute('href')).toBe('/building/test-building');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
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
  });

  it('stops propagation when clicking Hide button', async () => {
    // We wrap the component to check for propagation
    const handleParentClick = vi.fn();
    render(
        <div onClick={handleParentClick}>
            <BuildingPopupContent cluster={mockCluster} />
        </div>
    );

    const hideButton = screen.getByTitle('Hide');
    fireEvent.click(hideButton);

    expect(handleParentClick).not.toHaveBeenCalled();

    // Also verify the action happens
    await waitFor(() => {
         // Since status was 'pending' and we clicked Hide (ignored), it should upsert 'ignored'
         expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'ignored',
            user_id: 'test-user-id',
            building_id: '123'
         }), expect.anything());
         expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Building hidden' }));
    });
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
});
