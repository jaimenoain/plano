// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BuildingDetails from './BuildingDetails';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as supabaseFallback from '@/utils/supabaseFallback';

// Mock IntersectionObserver
const intersectionObserverMock = () => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = vi.fn().mockImplementation(intersectionObserverMock);

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    signOut: vi.fn(),
    toast: vi.fn(),
    upsert: vi.fn(),
    user: { id: 'user-123', email: 'test@example.com' } // Stable user object
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => {
        return { id: 'b1' };
    },
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div data-testid="app-layout">
        <h1>{title}</h1>
        {children}
    </div>
  ),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    signOut: mocks.signOut,
  }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { username: 'testuser', avatar_url: 'http://example.com/avatar.png', role: 'user' },
  }),
}));

// Auto-mock supabaseFallback
vi.mock('@/utils/supabaseFallback');

vi.mock('@/utils/location', () => ({
  parseLocation: () => ({ lat: 0, lng: 0 }),
}));

vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (path: string) => path ? `http://img/${path}` : null,
}));

vi.mock('@/integrations/supabase/client', () => {
    // Return a mocked user entry where rating is initially 0 (not rated) but status is visited
    // so we can see the circles.
  const userBuildingEntry = {
      id: 'review-1',
      content: '',
      rating: 0,
      created_at: '2023-01-01',
      edited_at: '2023-01-01',
      user_id: 'user-123',
      building_id: 'b1',
      status: 'visited',
      images: [],
      user: {
        username: 'testuser',
        avatar_url: null
      }
  };

  const createQueryBuilder = (table: string) => {
    let listResult: any = { data: [], error: null };
    let singleResult: any = { data: null, error: null };

    if (table === 'user_buildings') {
       listResult = { data: [userBuildingEntry], error: null };
       singleResult = { data: userBuildingEntry, error: null };
    }

    const builder: any = {
        then: (resolve: any, reject: any) => Promise.resolve(listResult).then(resolve, reject)
    };

    builder.select = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockImplementation((col, val) => {
        return builder;
    });
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn().mockResolvedValue(singleResult);
    builder.upsert = mocks.upsert.mockResolvedValue({ data: null, error: null });
    builder.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.delete = vi.fn().mockResolvedValue({ data: null, error: null });

    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      storage: {
          from: () => ({
              getPublicUrl: () => ({ data: { publicUrl: '' } })
          })
      }
    },
  };
});

vi.mock('@/features/maps/components/BuildingLocationMap', () => ({
  BuildingLocationMap: () => <div data-testid="map">Map</div>
}));

vi.mock('@/components/BuildingImageCard', () => ({
  BuildingImageCard: () => <div />
}));

describe('BuildingDetails Rating Hover', () => {
  const queryClient = new QueryClient({
      defaultOptions: {
          queries: {
              retry: false,
          },
      },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabaseFallback.fetchBuildingDetails).mockResolvedValue({
        id: 'b1',
        name: 'Test Building',
        address: '123 Main St',
        city: 'Metropolis',
        country: 'USA',
        year_completed: 2000,
        slug: 'test-building',
        short_id: 'tb',
        architects: [],
        location: { type: 'Point', coordinates: [0, 0] },
        created_by: 'other-user',
        styles: [],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('fills circles on hover', async () => {
    const { container } = render(
      <HelmetProvider>
        <TooltipProvider>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <SidebarProvider>
                        <BuildingDetails />
                    </SidebarProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </TooltipProvider>
      </HelmetProvider>
    );

    // Wait for content to load
    await waitFor(() => screen.getByText('Your Activity'));

    // Find the 3 circles. We can look for the SVG circles or the wrapper div.
    // The circles are Lucide 'Circle' components which render as <svg><circle .../></svg>
    // But they have class 'w-4 h-4 ...'
    // Let's use querySelectorAll on the container.
    // The circles have 'cursor-pointer' class.

    await waitFor(() => {
        const circles = container.querySelectorAll('svg.w-4.h-4.cursor-pointer');
        expect(circles.length).toBe(3);
    });

    const circles = container.querySelectorAll('svg.w-4.h-4.cursor-pointer');
    const circle1 = circles[0];
    const circle2 = circles[1];
    const circle3 = circles[2];

    // Initial state: 0 rating (from mock). All should be transparent fill.
    expect(circle1.getAttribute('class')).toContain('fill-transparent');
    expect(circle2.getAttribute('class')).toContain('fill-transparent');
    expect(circle3.getAttribute('class')).toContain('fill-transparent');

    // Hover over 2nd circle
    fireEvent.mouseEnter(circle2);

    // Expect 1st and 2nd to be filled, 3rd to be transparent
    // Wait for re-render
    await waitFor(() => {
        expect(circle1.getAttribute('class')).toContain('fill-[#595959]');
        expect(circle2.getAttribute('class')).toContain('fill-[#595959]');
        expect(circle3.getAttribute('class')).toContain('fill-transparent');
    });

    // Mouse leave (simulate by mouse enter on parent or just leave)
    // Actually we need to check how mouse leave is implemented.
    // My plan puts onMouseLeave on the parent div.
    // I need to find the parent div of these circles.
    const parentDiv = circle1.parentElement;
    if (parentDiv) fireEvent.mouseLeave(parentDiv);

    // Should return to empty
    await waitFor(() => {
        expect(circle1.getAttribute('class')).toContain('fill-transparent');
        expect(circle2.getAttribute('class')).toContain('fill-transparent');
    });

  });
});
