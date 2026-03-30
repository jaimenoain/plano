// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import UserPhotoGallery from './UserPhotoGallery';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock mocks
const mocks = vi.hoisted(() => {
  return {
    useIntersectionObserver: vi.fn(),
  };
});

vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: mocks.useIntersectionObserver,
}));

// Default intersection observer state
mocks.useIntersectionObserver.mockReturnValue({
    containerRef: vi.fn(),
    isVisible: false
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ username: 'testuser' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const createQueryBuilder = (table: string) => {
    const builder: any = {};

    // Common chainable methods
    builder.select = vi.fn().mockReturnThis();
    builder.eq = vi.fn().mockReturnThis();
    builder.ilike = vi.fn().mockReturnThis();
    builder.in = vi.fn().mockReturnThis();
    builder.order = vi.fn().mockReturnThis();
    builder.limit = vi.fn().mockReturnThis();
    builder.range = vi.fn().mockReturnThis();
    builder.maybeSingle = vi.fn();
    builder.single = vi.fn();
    builder.then = undefined; // Will be set dynamically based on table

    if (table === 'profiles') {
        const mockProfile = { id: 'user-123', username: 'testuser' };
        builder.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
    } else if (table === 'review_images') {
        // Generate mock images
        const generateImages = (count: number) => Array.from({ length: count }).map((_, i) => ({
             id: `img-${i}`,
             storage_path: `path-${i}.jpg`,
             likes_count: 0,
             review_id: `rev-${i}`,
             user_buildings: {
                 building: { id: `b-${i}`, name: `Building ${i}`, slug: `building-${i}` }
             }
        }));

        const total = 100;
        const allImages = generateImages(total);

        // Override range to return sliced data
        builder.range.mockImplementation((from, to) => {
             const sliced = allImages.slice(from, to + 1);
             return Promise.resolve({ data: sliced, error: null });
        });

        // Default then (if range not called)
        builder.then = (resolve: any) => Promise.resolve({ data: generateImages(20), error: null }).then(resolve);
    } else if (table === 'image_likes') {
        builder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
    }

    return builder;
  };

  return {
    supabase: {
      from: (table: string) => createQueryBuilder(table),
    },
  };
});

describe('UserPhotoGallery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useIntersectionObserver.mockReturnValue({
            containerRef: vi.fn(),
            isVisible: false
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders initial photos', async () => {
        render(
            <HelmetProvider>
                <TooltipProvider>
                    <BrowserRouter>
                        <SidebarProvider>
                            <UserPhotoGallery />
                        </SidebarProvider>
                    </BrowserRouter>
                </TooltipProvider>
            </HelmetProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Building 0')).toBeTruthy();
            expect(screen.getByTestId('sentinel')).toBeTruthy();
        });
    });
});
