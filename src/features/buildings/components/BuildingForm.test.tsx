// @vitest-environment happy-dom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BuildingForm, BuildingFormData } from './BuildingForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock useUserProfile
vi.mock('@/features/profile/hooks/useUserProfile', () => ({
  useUserProfile: vi.fn(() => ({
    profile: null,
    loading: false,
    refetch: vi.fn()
  }))
}));

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
    access_level: 'public',
    access_logistics: 'walk-in',
    access_cost: 'free',
    access_notes: 'Free public access',
    designCreditEntities: [],
    functional_category_id: null,
    functional_typology_ids: [],
    selected_attribute_ids: [],
  };

  it('hides alt_name and aliases by default in edit mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
          mode="edit"
        />
      </QueryClientProvider>
    );

    expect(screen.queryByLabelText(/Alternative Name \(English\)/i)).toBeNull();
    expect(screen.queryByText(/Search Aliases \(Hidden\)/i)).toBeNull();
  });

  it('renders alt_name and aliases when data is provided in edit mode', () => {
    const valuesWithAlt = { ...initialValues, alt_name: 'Test Alt' };
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={valuesWithAlt}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
          mode="edit"
        />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Alternative Name \(English\)/i)).toBeTruthy();
    expect(screen.getByText(/Search Aliases \(Hidden\)/i)).toBeTruthy();
    // Helper texts
    expect(screen.getByText(/Display name for international users/i)).toBeTruthy();
    expect(screen.getByText(/Nicknames or alternate spellings for search only/i)).toBeTruthy();
  });

  it('shows alt_name and aliases when "Add Aliases" is clicked in edit mode', () => {
    const { getByRole, getByLabelText, queryByRole } = render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
          mode="edit"
        />
      </QueryClientProvider>
    );

    const addButton = getByRole('button', { name: /Add Aliases/i });
    expect(addButton).toBeTruthy();

    fireEvent.click(addButton);

    expect(getByLabelText(/Alternative Name \(English\)/i)).toBeTruthy();
    expect(queryByRole('button', { name: /Add Aliases/i })).toBeNull();
  });

  it('shows the optional-details banner and Skip for now in create mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save Building"
          mode="create"
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Only a name is required/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Skip for now/i })).toBeTruthy();
  });

  it('does not show the optional-details banner or Skip for now in edit mode', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BuildingForm
          initialValues={initialValues}
          onSubmit={async () => {}}
          isSubmitting={false}
          submitLabel="Save"
          mode="edit"
        />
      </QueryClientProvider>
    );

    expect(screen.queryByText(/Only a name is required/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Skip for now/i })).toBeNull();
  });

  describe('design credits field (Task 2.5)', () => {
    const withCredit: BuildingFormData = {
      ...initialValues,
      designCreditEntities: [{ id: 'p1', name: 'Ada Arch', kind: 'person' as const }],
    };

    it('renders the picker by default so the create and admin flows keep it', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={withCredit}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
            mode="edit"
          />
        </QueryClientProvider>
      );

      expect(screen.getByText('Design credits')).toBeTruthy();
      expect(screen.getByPlaceholderText(/Search people or companies/i)).toBeTruthy();
    });

    it('offers "Add design credits" by default when the building has none', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={initialValues}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
            mode="edit"
          />
        </QueryClientProvider>
      );

      expect(screen.getByRole('button', { name: /Add design credits/i })).toBeTruthy();
    });

    it('hides the picker and its reveal button when the host opts out', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={withCredit}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
            mode="edit"
            showDesignCreditsField={false}
          />
        </QueryClientProvider>
      );

      expect(screen.queryByText('Design credits')).toBeNull();
      expect(screen.queryByPlaceholderText(/Search people or companies/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Add design credits/i })).toBeNull();
    });

    it('still shows the architect statement when the host reports a verified claim', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={initialValues}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
            mode="edit"
            showDesignCreditsField={false}
            verifiedCreditClaim
          />
        </QueryClientProvider>
      );

      expect(screen.getByText('Architect statement')).toBeTruthy();
      expect(screen.queryByPlaceholderText(/Search people or companies/i)).toBeNull();
    });
  });

  describe('Access Notes Placeholder', () => {
    it('shows default placeholder when cost is free and logistics is walk-in', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={{
              ...initialValues,
              access_cost: 'free',
              access_logistics: 'walk-in',
            }}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
          />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText("e.g., Closed on public holidays, enter through the east gate...");
      expect(textarea).toBeTruthy();
    });

    it('shows dynamic placeholder when cost is paid', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={{
              ...initialValues,
              access_cost: 'paid',
              access_logistics: 'walk-in',
            }}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
          />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText("e.g., Add ticket link, entry prices, or booking instructions...");
      expect(textarea).toBeTruthy();
    });

    it('shows dynamic placeholder when logistics is booking_required', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={{
              ...initialValues,
              access_cost: 'free',
              access_logistics: 'booking_required',
            }}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Save"
          />
        </QueryClientProvider>
      );

      const textarea = screen.getByPlaceholderText("e.g., Add ticket link, entry prices, or booking instructions...");
      expect(textarea).toBeTruthy();
    });
  });

  describe('externalDirty (Task 3.1)', () => {
    const renderEdit = (externalDirty?: boolean) =>
      render(
        <QueryClientProvider client={queryClient}>
          <BuildingForm
            initialValues={initialValues}
            onSubmit={async () => {}}
            isSubmitting={false}
            submitLabel="Update Building"
            mode="edit"
            externalDirty={externalDirty}
          />
        </QueryClientProvider>
      );

    it('leaves submit disabled when neither the fields nor the page are dirty', () => {
      renderEdit();

      expect(screen.getByRole('button', { name: /Update Building/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByText('No changes to save')).toBeTruthy();
    });

    it('enables submit when the page reports dirty state of its own', () => {
      renderEdit(true);

      expect(screen.getByRole('button', { name: /Update Building/i }).hasAttribute('disabled')).toBe(false);
      expect(screen.queryByText('No changes to save')).toBeNull();
    });
  });
});
