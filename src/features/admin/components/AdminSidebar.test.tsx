// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminSidebar } from './AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BrowserRouter } from 'react-router-dom';

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
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'admin@example.com' },
    signOut: mocks.signOut,
  }),
}));

describe('AdminSidebar Sign Out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call signOut and navigate to / when sign out is clicked', async () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <AdminSidebar />
        </SidebarProvider>
      </BrowserRouter>
    );

    const signOutButton = await screen.findByText('Sign out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith('/');
    });
  });
});
