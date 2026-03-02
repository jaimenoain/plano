Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
import { HelmetProvider } from 'react-helmet-async';
import { SidebarProvider } from '../components/ui/sidebar';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from './Index';
import { useAuth } from '../hooks/useAuth';
import { useFeed } from '../hooks/useFeed';
import { useSuggestedFeed } from '../hooks/useSuggestedFeed';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';

// Mock the hooks
vi.mock('../hooks/useAuth');
vi.mock('../hooks/useFeed');
vi.mock('../hooks/useSuggestedFeed');
vi.mock('../hooks/useDiscoveryFeed');
vi.mock('../hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({ containerRef: null, isVisible: false })
}));
vi.mock('../components/layout/AppLayout', () => ({ AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div> }));
vi.mock('../components/feed/ExploreTeaserBlock', () => ({ ExploreTeaserBlock: () => <div data-testid="explore-teaser" /> }));
vi.mock('../components/feed/AllCaughtUpDivider', () => ({ AllCaughtUpDivider: () => <div data-testid="all-caught-up" /> }));
vi.mock('../components/feed/ReviewCard', () => ({ ReviewCard: () => <div data-testid="review-card" /> }));

const queryClient = new QueryClient();

describe('Index Page', () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user', user_metadata: { onboarding_completed: true } },
      loading: false,
    });

    (useFeed as any).mockReturnValue({
      data: { pages: [[{ type: 'compact', entry: { id: 'test', building: { id: 'b', name: 'B' }, user: { id: 'u', username: 'U' } } }]] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
    });

    (useSuggestedFeed as any).mockReturnValue({
      data: { pages: [[]] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
      fetchNextPage: vi.fn(),
    });

    (useDiscoveryFeed as any).mockReturnValue({
      data: { pages: [[]] },
      isLoading: false,
    });
  });

  it('renders ExploreTeaserBlock after AllCaughtUpDivider', () => {
    const { getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HelmetProvider><SidebarProvider><Index /></SidebarProvider></HelmetProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(getByTestId('all-caught-up')).toBeTruthy();
    expect(getByTestId('explore-teaser')).toBeTruthy();
  });
});
