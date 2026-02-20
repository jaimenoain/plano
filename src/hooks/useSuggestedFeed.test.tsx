// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSuggestedFeed } from './useSuggestedFeed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

// Mock getBuildingImageUrl
vi.mock('@/utils/image', () => ({
  getBuildingImageUrl: (path: string) => `https://example.com/${path}`,
}));

describe('useSuggestedFeed', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should fetch suggested posts and images', async () => {
    const mockPosts = [
      {
        id: 'review-1',
        content: 'Great building',
        rating: 5,
        is_suggested: true,
        suggestion_reason: 'Popular',
        building_data: { id: 'b1', name: 'Building 1' },
        user_data: { username: 'user1' },
      },
    ];

    const mockImages = [
      { id: 'img-1', review_id: 'review-1', storage_path: 'path/to/image.jpg', likes_count: 10 },
    ];

    (supabase.rpc as any).mockResolvedValue({ data: mockPosts, error: null });

    // Mock chain for review_images and image_likes
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'review_images') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockImages, error: null }),
          }),
        };
      }
      if (table === 'image_likes') {
         return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [{ image_id: 'img-1' }], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });


    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSuggestedFeed(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toHaveLength(1);
    const review = result.current.data?.pages[0][0];

    expect(review?.id).toBe('review-1');
    expect(review?.is_suggested).toBe(true);
    expect(review?.suggestion_reason).toBe('Popular');
    expect(review?.images).toHaveLength(1);
    expect(review?.images?.[0].url).toBe('https://example.com/path/to/image.jpg');
    expect(review?.images?.[0].is_liked).toBe(true);

    // Verify RPC call
    expect(supabase.rpc).toHaveBeenCalledWith('get_suggested_posts', {
      p_limit: 10,
      p_offset: 0,
    });
  });
});
