
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { useURLMapState } from './useURLMapState';
import React from 'react';

// Helper component to expose hook and URL state
function TestComponent() {
  const { setMapURL, filters } = useURLMapState();
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div data-testid="url-params">{searchParams.toString()}</div>
      <button
        onClick={() => {
            // Simulate updating filters with contacts
            setMapURL({
                filters: {
                    ...filters,
                    status: ['visited'],
                    contacts: [{ id: '1', name: 'Ezgaa', avatar_url: null }]
                }
            });
        }}
      >
        Update Filters
      </button>
    </div>
  );
}

describe('useURLMapState redundancy fix', () => {
  it('reproduces the issue: ratedBy should be absent in filters JSON when contacts are present', async () => {
    // Start with rated_by param. Hook will parse it into filters.ratedBy.
    render(
      <MemoryRouter initialEntries={['/?rated_by=Ezgaa']}>
        <TestComponent />
      </MemoryRouter>
    );

    // Wait for render? render is synchronous usually but with router...
    // Let's use findByText
    const button = await screen.findByText('Update Filters');
    await act(async () => {
      button.click();
    });

    const urlParams = new URLSearchParams(screen.getByTestId('url-params').textContent || '');
    const filtersJson = urlParams.get('filters');
    const ratedByParam = urlParams.get('rated_by');

    // Confirm rated_by param is there (because contacts are present)
    expect(ratedByParam).toBe('Ezgaa');

    // Confirm filters JSON does NOT contain ratedBy (The FIX)
    const filters = JSON.parse(filtersJson || '{}');
    expect(filters.contacts).toHaveLength(1);
    expect(filters.ratedBy).toBeUndefined();
    expect(filters.status).toEqual(['visited']);
  });
});
