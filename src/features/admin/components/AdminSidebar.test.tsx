// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminSidebar } from './AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BrowserRouter } from 'react-router';

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'admin@example.com' },
    signOut: mocks.signOut,
  }),
}));

// Badge-count nav hooks: render with empty data so no QueryClient/network is needed.
vi.mock('@/features/awards/hooks/useAwards', () => ({
  useSuggestions: () => ({ data: [] }),
  useAwardClaimRequests: () => ({ data: [] }),
}));

// Intervention-flag query source: keep empty so the inline useQuery resolves to [].
vi.mock('@/features/admin/api/programme', () => ({
  fetchInterventionFlags: vi.fn().mockResolvedValue([]),
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('AdminSidebar Sign Out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call signOut and navigate to / when sign out is clicked', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <BrowserRouter>
          <SidebarProvider>
            <AdminSidebar />
          </SidebarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    const signOutButton = await screen.findByText('Sign out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith('/');
    });
  });
});
