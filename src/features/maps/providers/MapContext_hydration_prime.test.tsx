// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { MapProvider, useMapContext } from './MapContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock Supabase
const { selectMock, inMock } = vi.hoisted(() => {
  const inFn = vi.fn();
  const selectFn = vi.fn().mockReturnValue({ in: inFn });
  return { selectMock: selectFn, inMock: inFn };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: selectMock
    })
  }
}));

const wrapperWithUrl = (url: string) => ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={[url]}>
    <MapProvider>{children}</MapProvider>
  </MemoryRouter>
);

describe('MapProvider Hydration Prime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockClear();
    inMock.mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('primes cache when setting contacts via setFilter', async () => {
    inMock.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useMapContext(), {
      wrapper: wrapperWithUrl('/')
    });

    // Ensure initial state is clean
    if (result.current.state.filters.ratedBy) {
        console.error('Initial ratedBy LEAK:', result.current.state.filters.ratedBy);
    }
    expect(result.current.state.filters.contacts).toBeUndefined();
    expect(result.current.state.filters.ratedBy).toBeUndefined();

    const contact = { id: '456', name: 'Bob', avatar_url: null };

    await act(async () => {
        result.current.methods.setFilter('contacts', [contact]);
    });

    // Check immediate availability (primed cache)
    expect(result.current.state.filters.contacts).toHaveLength(1);
    expect(result.current.state.filters.contacts![0]).toEqual(contact);

    // Also check ratedBy is present (from URL)
    expect(result.current.state.filters.ratedBy).toEqual(['Bob']);

    // Ensure Supabase was NOT called (cache hit)
    // We wait briefly to ensure no async effect fires
    await new Promise(r => setTimeout(r, 100));

    if (inMock.mock.calls.length > 0) {
        console.log('Unexpected calls:', inMock.mock.calls);
    }

    expect(inMock).not.toHaveBeenCalled();
  });
});
