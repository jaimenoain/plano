// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
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

describe('MapProvider Hydration Fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockClear();
    inMock.mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('hydrates contacts from rated_by URL param', async () => {
    inMock.mockResolvedValue({
      data: [{ id: '123', username: 'Ezgaa', avatar_url: 'avatar.jpg' }],
      error: null
    });

    const { result } = renderHook(() => useMapContext(), {
      wrapper: wrapperWithUrl('/?rated_by=Ezgaa')
    });

    await waitFor(() => {
        expect(result.current.state.filters.contacts).toHaveLength(1);
    });

    expect(result.current.state.filters.contacts![0]).toEqual({
        id: '123',
        name: 'Ezgaa',
        avatar_url: 'avatar.jpg'
    });

    expect(inMock).toHaveBeenCalledWith('username', ['Ezgaa']);
  });
});
