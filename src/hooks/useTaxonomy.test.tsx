import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTaxonomy } from './useTaxonomy';
import { useQuery } from '@tanstack/react-query';

// Mock useQuery
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useTaxonomy', () => {
  it('should return initial loading state', () => {
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useTaxonomy());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.functionalCategories).toEqual([]);
  });

  it('should derive attributes correctly', async () => {
    const mockCategories = [{ id: 'c1', name: 'Cat 1' }];
    const mockTypologies = [{ id: 't1', name: 'Typ 1' }];
    const mockGroups = [
      { id: 'g1', name: 'Materiality', slug: 'materiality' },
      { id: 'g2', name: 'Context', slug: 'context' },
      { id: 'g3', name: 'Style', slug: 'style' },
    ];
    const mockAttributes = [
      { id: 'a1', name: 'Brick', group_id: 'g1' },
      { id: 'a2', name: 'Urban', group_id: 'g2' },
      { id: 'a3', name: 'Modern', group_id: 'g3' },
    ];

    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0];
      if (key === 'functional_categories') return { data: mockCategories, isLoading: false };
      if (key === 'functional_typologies') return { data: mockTypologies, isLoading: false };
      if (key === 'attribute_groups') return { data: mockGroups, isLoading: false };
      if (key === 'attributes') return { data: mockAttributes, isLoading: false };
      return { data: undefined, isLoading: false };
    });

    const { result } = renderHook(() => useTaxonomy());

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.materialityAttributes).toHaveLength(1);
    expect(result.current.materialityAttributes[0].name).toBe('Brick');

    expect(result.current.contextAttributes).toHaveLength(1);
    expect(result.current.contextAttributes[0].name).toBe('Urban');

    expect(result.current.styleAttributes).toHaveLength(1);
    expect(result.current.styleAttributes[0].name).toBe('Modern');
  });
});
