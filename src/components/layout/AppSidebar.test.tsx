// @vitest-environment happy-dom
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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
    user: { email: 'test@example.com' },
    signOut: mocks.signOut,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/features/profile/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png' },
    loading: false,
    refetch: vi.fn(),
  }),
}));

/** Desktop path: trigger must call `setOpen` / `onOpenChange`, not only `openMobile`. */
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
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
    const profileLink = links.find(link => link.getAttribute('href') === '/profile/testuser' && link.textContent === 'Your profile');
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

  it('toggles sidebar state when SidebarTrigger and Close are used', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <BrowserRouter>
          <SidebarProvider open={open} onOpenChange={setOpen}>
            <AppSidebar />
            <SidebarTrigger />
          </SidebarProvider>
        </BrowserRouter>
      );
    }

    const { container } = render(<Controlled />);

    const getProvider = () => container.querySelector("[class*='sidebar-wrapper']");

    expect(getProvider()).toHaveAttribute("data-state", "collapsed");

    const trigger = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(getProvider()).toHaveAttribute("data-state", "expanded");
    });

    const closeBtn = getProvider()?.querySelector('button[aria-label="Close menu"]');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);

    await waitFor(() => {
      expect(getProvider()).toHaveAttribute("data-state", "collapsed");
    });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(getProvider()).toHaveAttribute("data-state", "expanded");
    });
  });
});
