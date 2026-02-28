// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useArchitect } from './useArchitect';

// Mock Supabase client
const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.select,
    })),
  },
}));

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

    // Setup mock chain
    // First call is for 'architects' table
    // Second call is for 'building_architects' table

    // We need to handle the chain calls carefully since we mock 'from' once
    // But different 'from' calls return the same mock object in this simple setup
    // So we can inspect the calls or just make the chain work for both.

    // Let's make 'select' return an object with 'eq'
    // 'eq' returns an object with 'single' (for first call) or is final (for second call promise)

    // Implementation of the chain:
    // supabase.from('architects').select('*').eq(...).single()
    // supabase.from('building_architects').select(...).eq(...)

    // We can use mockImplementation to return different things based on the table name if we mock 'from' properly
    // OR we can just return a chain that resolves differently based on the order of calls (flaky)

    // Better approach: mock 'from' implementation
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

    // Verify mapping
    const buildingOne = result.current.buildings.find(b => b.id === 'build-1');
    expect(buildingOne).toBeDefined();
    expect(buildingOne?.main_image_url).toBe('path/to/image.jpg');

    const buildingTwo = result.current.buildings.find(b => b.id === 'build-2');
    expect(buildingTwo).toBeDefined();
    expect(buildingTwo?.main_image_url).toBeNull();
  });
});
