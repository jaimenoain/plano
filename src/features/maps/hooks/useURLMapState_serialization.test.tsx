import { Window } from 'happy-dom';
const window = new Window();
global.window = window as any;
global.document = window.document as any;

import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useURLMapState, MapStateSchema } from './useURLMapState';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('useURLMapState serialization', () => {
  it('schema validates contacts structure', () => {
      const input = {
          filters: JSON.stringify({
              contacts: [
                  { id: '123', name: 'alice', avatar_url: 'http://example.com/alice.jpg' }
              ]
          })
      };
      const result = MapStateSchema.parse(input);
      expect(result.filters.contacts).toHaveLength(1);
      expect(result.filters.contacts![0].name).toBe('alice');
  });

  it('parses rated_by from URL into filters.ratedBy', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/?rated_by=alice,bob']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useURLMapState(), { wrapper });

    expect(result.current.filters.ratedBy).toEqual(['alice', 'bob']);
  });

  it('setMapURL updates rated_by param when contacts are set', () => {
     // We start with no params
     const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useURLMapState(), { wrapper });

    act(() => {
        result.current.setMapURL({
            filters: {
                contacts: [{ id: '1', name: 'charlie', avatar_url: null }]
            }
        });
    });

    // Check if the state reflects the change (which comes from URL)
    // The hook parses `rated_by` from URL into `filters.ratedBy`
    expect(result.current.filters.contacts).toHaveLength(1);
    expect(result.current.filters.contacts![0].name).toBe('charlie');
    expect(result.current.filters.ratedBy).toEqual(['charlie']);
  });

  it('removes rated_by param when contacts are cleared', () => {
      // Start with a state that implies rated_by is set
      // Note: MemoryRouter initialEntries sets the initial URL.
      // If we don't have filters.contacts in URL JSON, but have rated_by,
      // filters.ratedBy will be set.

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/?rated_by=dave']}>
          {children}
        </MemoryRouter>
      );

      const { result } = renderHook(() => useURLMapState(), { wrapper });

      // Initially valid
      expect(result.current.filters.ratedBy).toEqual(['dave']);

      act(() => {
          // Clear contacts
          // setMapURL replaces filters. So if we pass empty contacts, it should clear rated_by
          result.current.setMapURL({
              filters: {
                  contacts: []
              }
          });
      });

      // Should be cleared
      expect(result.current.filters.ratedBy).toBeUndefined();
  });
});
