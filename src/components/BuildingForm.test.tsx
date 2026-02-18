// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BuildingForm, BuildingFormData } from './BuildingForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('BuildingForm', () => {
  const initialValues: BuildingFormData = {
    name: 'Test Building',
    alt_name: null,
    aliases: [],
    year_completed: 2020,
    status: 'Built',
    access: 'Open Access',
    architects: [],
    styles: [],
    functional_category_id: null,
    functional_typology_ids: [],
    selected_attribute_ids: [],
  };

  it('hides alt_name and aliases by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
        />
      </QueryClientProvider>
    );

    expect(screen.queryByLabelText(/Alternative Name \(English\)/i)).toBeNull();
    expect(screen.queryByText(/Search Aliases \(Hidden\)/i)).toBeNull();
  });

  it('renders alt_name and aliases when data is provided', () => {
    const valuesWithAlt = { ...initialValues, alt_name: 'Test Alt' };
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={valuesWithAlt}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Alternative Name \(English\)/i)).toBeTruthy();
    expect(screen.getByText(/Search Aliases \(Hidden\)/i)).toBeTruthy();
    // Helper texts
    expect(screen.getByText(/Display name for international users/i)).toBeTruthy();
    expect(screen.getByText(/Nicknames or alternate spellings for search only/i)).toBeTruthy();
  });

  it('shows alt_name and aliases when "Add Aliases" is clicked', () => {
    const { getByRole, getByLabelText, queryByRole } = render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
        />
      </QueryClientProvider>
    );

    const addButton = getByRole('button', { name: /Add Aliases/i });
    expect(addButton).toBeTruthy();

    fireEvent.click(addButton);

    expect(getByLabelText(/Alternative Name \(English\)/i)).toBeTruthy();
    expect(queryByRole('button', { name: /Add Aliases/i })).toBeNull();
  });
});
