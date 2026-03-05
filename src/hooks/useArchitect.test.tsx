// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useArchitect } from './useArchitect';

describe('useArchitect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('correctly maps building main_image_url', async () => {
    const architectId = 'arch-123';

    // Mock Architect Data Response
    const mockArchitectData = {
      id: architectId,
      name: 'Test Architect',
      type: 'individual',
    };

    // Mock Buildings Data Response
    const mockBuildingsData = [
      {
        building: {
          id: 'build-1',
          name: 'Building One',
          city: 'City A',
          country: 'Country A',
          year_completed: 2020,
          main_image_url: 'path/to/image.jpg'
        }
      },
      {
        building: {
          id: 'build-2',
          name: 'Building Two',
          city: 'City B',
          country: 'Country B',
          year_completed: 2021,
          main_image_url: null // No image
        }
      }
    ];

    const mockProfileData = {
      username: 'testuser'
    };

    const fromMock = vi.fn((table: string) => {
      if (table === 'architects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockArchitectData, error: null })
            }))
          }))
        };
      }
      if (table === 'building_architects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: mockBuildingsData, error: null })
          }))
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockProfileData, error: null })
            }))
          }))
        };
      }
      return { select: vi.fn() };
    });

    // Re-apply the mock to the module
    // @ts-ignore
    const { supabase } = await import('@/integrations/supabase/client');
    supabase.from = fromMock;

    const { result } = renderHook(() => useArchitect(architectId));

    // Wait for loading to finish
    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });

    expect(result.current.architect).toEqual(mockArchitectData);
    expect(result.current.buildings).toHaveLength(2);
    expect(result.current.linkedUser).toEqual({ username: 'testuser' });

    // Verify mapping
    const buildingOne = result.current.buildings.find(b => b.id === 'build-1');
    expect(buildingOne).toBeDefined();
    expect(buildingOne?.main_image_url).toBe('path/to/image.jpg');

    const buildingTwo = result.current.buildings.find(b => b.id === 'build-2');
    expect(buildingTwo).toBeDefined();
    expect(buildingTwo?.main_image_url).toBeNull();
  });
});
