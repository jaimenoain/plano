import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleDragEndLogic } from './kanbanLogic';
import { FeedReview } from '@/types/feed';

describe('handleDragEndLogic', () => {
  let mockSetContent: any;
  let mockSupabase: any;
  let mockToast: any;
  let mockContent: FeedReview[];

  beforeEach(() => {
    mockSetContent = vi.fn();
    mockToast = vi.fn();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockContent = [
      { id: '1', rating: 1, edited_at: '2023-01-01' } as unknown as FeedReview,
      { id: '2', rating: 2, edited_at: '2023-01-01' } as unknown as FeedReview,
      { id: '3', rating: null, edited_at: '2023-01-01' } as unknown as FeedReview, // Saved/Pending
    ];
  });

  it('should update rating when dropped on "3-points" column', async () => {
    await handleDragEndLogic({
      activeId: '1',
      overId: '3-points',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    // Check optimistic update
    expect(mockSetContent).toHaveBeenCalled();
    const updateFn = mockSetContent.mock.calls[0][0];
    const newContent = updateFn(mockContent);
    expect(newContent.find((i: any) => i.id === '1').rating).toBe(3);

    // Check Supabase update
    expect(mockSupabase.from).toHaveBeenCalledWith('user_buildings');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      rating: 3
    }));
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');

    // DATA INTEGRITY CHECK: Ensure status is NOT in the update payload
    const updatePayload = mockSupabase.update.mock.calls[0][0];
    expect(updatePayload).toHaveProperty('rating');
    expect(updatePayload).toHaveProperty('edited_at');
    expect(updatePayload).not.toHaveProperty('status');
  });

  it('should update rating when dropped on "saved" column (rating 0/null)', async () => {
    await handleDragEndLogic({
      activeId: '2', // Rating 2
      overId: 'saved',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    // Check optimistic update
    const updateFn = mockSetContent.mock.calls[0][0];
    const newContent = updateFn(mockContent);
    expect(newContent.find((i: any) => i.id === '2').rating).toBeNull();

    // Check Supabase update
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      rating: null
    }));

    // DATA INTEGRITY CHECK
    const updatePayload = mockSupabase.update.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty('status');
  });

  it('should update rating when dropped on another card', async () => {
    // Drop card '1' (rating 1) onto card '2' (rating 2) -> should become rating 2
    await handleDragEndLogic({
      activeId: '1',
      overId: '2',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    // Check optimistic update
    const updateFn = mockSetContent.mock.calls[0][0];
    const newContent = updateFn(mockContent);
    expect(newContent.find((i: any) => i.id === '1').rating).toBe(2);

    // Check Supabase update
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      rating: 2
    }));
  });

  it('should NOT update if dropped on same rating column', async () => {
    await handleDragEndLogic({
      activeId: '1', // Rating 1
      overId: '1-point',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    expect(mockSetContent).not.toHaveBeenCalled();
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });

  it('should NOT update if dropped on same card or no change', async () => {
    await handleDragEndLogic({
      activeId: '1',
      overId: '1',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    expect(mockSetContent).not.toHaveBeenCalled();
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });

  it('should revert update if Supabase fails', async () => {
    mockSupabase.eq.mockResolvedValueOnce({ error: new Error('DB Error') });

    await handleDragEndLogic({
      activeId: '1',
      overId: '3-points',
      content: mockContent,
      setContent: mockSetContent,
      supabase: mockSupabase,
      toast: mockToast,
    });

    // Expect initial update
    expect(mockSetContent).toHaveBeenCalledTimes(2); // Optimistic + Revert

    // First call: Optimistic update
    const firstUpdateFn = mockSetContent.mock.calls[0][0];
    const optimisticContent = firstUpdateFn(mockContent);
    expect(optimisticContent.find((i: any) => i.id === '1').rating).toBe(3);

    // Second call: Revert (sets content back to previousContent which is mockContent array ref)
    // Actually implementation does: setContent(previousContent)
    const secondUpdateArg = mockSetContent.mock.calls[1][0];
    expect(secondUpdateArg).toEqual(mockContent); // Should match original array items

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive'
    }));
  });
});
