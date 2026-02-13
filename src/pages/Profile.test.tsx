// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from './Profile';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => ({ username: 'testuser' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png' },
  }),
}));

vi.mock('@/components/profile/UserCard', () => ({
  UserCard: ({ onSignOut }: { onSignOut: () => void }) => (
    <button onClick={onSignOut}>Mock Sign Out</button>
  ),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useProfileComparison
vi.mock('@/hooks/useProfileComparison', () => ({
  useProfileComparison: () => ({
    profileComparison: {
      mutualAffinityUsers: [],
      commonFollowers: [],
    },
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const mockQueryBuilder = {
    eq: () => mockQueryBuilder,
    ilike: () => mockQueryBuilder,
    in: () => mockQueryBuilder,
    select: () => mockQueryBuilder,
    maybeSingle: () => Promise.resolve({ data: { id: 'user-123', username: 'testuser' } }),
    limit: () => Promise.resolve({ data: [] }),
    order: () => mockQueryBuilder,
  };

  return {
    supabase: {
      from: () => mockQueryBuilder,
      storage: {
          from: () => ({
              getPublicUrl: () => ({ data: { publicUrl: '' } })
          })
      }
    },
  };
});

describe('Profile Sign Out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call signOut and navigate to / when sign out is triggered', async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <SidebarProvider>
            <Profile />
          </SidebarProvider>
        </BrowserRouter>
      </HelmetProvider>
    );

    const signOutButton = await screen.findByText('Mock Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith('/');
    });
  });
});
