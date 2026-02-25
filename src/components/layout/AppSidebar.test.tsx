// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';
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
    user: { email: 'test@example.com' },
    signOut: mocks.signOut,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png' },
  }),
}));

// Mock UI components to avoid Portal issues
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cookie for SidebarProvider
    document.cookie = 'sidebar:state=; Max-Age=0; path=/;';
  });

  it('should render Notifications link', () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </BrowserRouter>
    );

    const links = screen.getAllByRole('link');
    const notificationLink = links.find(link => link.getAttribute('href') === '/notifications');
    expect(notificationLink).toBeTruthy();
  });

  it('should render Your profile link', () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
        </SidebarProvider>
      </BrowserRouter>
    );

    const links = screen.getAllByRole('link');
    const profileLink = links.find(link => link.getAttribute('href') === '/profile' && link.textContent === 'Your profile');
    expect(profileLink).toBeTruthy();
  });

  // it('should call signOut and navigate to / when sign out is clicked', async () => {
  //   render(
  //     <BrowserRouter>
  //       <SidebarProvider>
  //         <AppSidebar />
  //       </SidebarProvider>
  //     </BrowserRouter>
  //   );

  //   // With mocked Dropdown, the content should be visible immediately (or we need to click trigger if we hid it?)
  //   // In our mock, we just render children.

  //   // Find the Sign out button
  //   const signOutButton = await screen.findByText('Sign out');
  //   fireEvent.click(signOutButton);

  //   await waitFor(() => {
  //     expect(mocks.signOut).toHaveBeenCalled();
  //     expect(mocks.navigate).toHaveBeenCalledWith('/');
  //   });
  // });
});
