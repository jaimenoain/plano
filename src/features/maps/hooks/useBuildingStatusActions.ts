/**
 * useBuildingStatusActions
 *
 * Single source of truth for the Visited / Save / Hide + rating mutations on a
 * building. Extracted verbatim from BuildingPopupContent so the map-hover popup
 * and the redesigned BuildingDrawerBody share one implementation instead of
 * duplicating the upsert/delete/confirm logic.
 *
 * Behaviour preserved exactly:
 *   - toggling a status off checks for an existing review/photos and routes
 *     through a confirmation dialog before deleting the user_buildings row;
 *   - setting a status upserts into user_buildings and invalidates the
 *     user-building-statuses + map-clusters-v3 caches;
 *   - rating writes to user_buildings.rating with an optimistic local value.
 *
 * The confirmation dialog UI itself stays in each consumer (they render an
 * AlertDialog wired to confirmOpen/confirmTitle/confirmMessage/confirmDelete).
 */
import { useState, type MouseEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserBuildingStatuses } from '@/features/profile/hooks/useUserBuildingStatuses';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Status = 'pending' | 'visited' | 'ignored';

export function useBuildingStatusActions(buildingId: string) {
  const { user } = useAuth();
  const { statuses, ratings } = useUserBuildingStatuses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [justInteracted, setJustInteracted] = useState<'saved' | 'visited' | null>(null);
  const [optimisticRating, setOptimisticRating] = useState<number | null>(null);

  // Confirmation dialog state (owned here; rendered by the consumer)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<(() => void) | null>(null);

  const viewerStatus = statuses[buildingId];
  const isSaved = viewerStatus === 'pending';
  const isVisited = viewerStatus === 'visited';
  const isIgnored = viewerStatus === 'ignored';
  const currentRating = optimisticRating !== null ? optimisticRating : (ratings[buildingId] || 0);

  const performUpdate = async (
    status: Status,
    successMessage: string,
    removeMessage: string,
  ) => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (viewerStatus === status) {
        // Toggle off (delete)
        const { error } = await supabase
          .from('user_buildings')
          .delete()
          .match({ user_id: user.id, building_id: buildingId });

        if (error) throw error;
        toast({ title: removeMessage });
        setJustInteracted(null);
      } else {
        // Set new status
        const { error } = await supabase.from('user_buildings').upsert(
          {
            user_id: user.id,
            building_id: buildingId,
            status,
          },
          { onConflict: 'user_id, building_id' },
        );

        if (error) throw error;
        toast({ title: successMessage });
        setJustInteracted(
          status === 'pending' ? 'saved' : status === 'visited' ? 'visited' : null,
        );
      }

      queryClient.invalidateQueries({ queryKey: ['user-building-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['map-clusters-v3'] });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update status' });
    } finally {
      setIsSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleAction = async (
    status: Status,
    successMessage: string,
    removeMessage: string,
  ) => {
    if (!user) {
      toast({ title: 'Please log in first' });
      return;
    }

    // Removing the status (toggling off) — warn if it destroys content
    if (viewerStatus === status) {
      setIsSaving(true);
      try {
        const { data: postsData } = await supabase
          .from('building_posts')
          .select('id, body')
          .eq('user_id', user.id)
          .eq('building_id', buildingId);

        const hasReview = postsData?.some((p) => p.body && p.body.trim().length > 0);
        const postIds = (postsData ?? []).map((p) => p.id);
        let imageCount = 0;
        if (postIds.length > 0) {
          const { count } = await supabase
            .from('review_images')
            .select('id', { count: 'exact', head: true })
            .in('review_id', postIds);
          imageCount = count ?? 0;
        }

        if (hasReview || imageCount > 0) {
          let msg = 'You are about to remove this building from your list.';
          if (hasReview && imageCount > 0) {
            msg += ` This will permanently delete your review and ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
          } else if (hasReview) {
            msg += ' This will permanently delete your written review.';
          } else if (imageCount > 0) {
            msg += ` This will permanently delete ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
          }
          setConfirmTitle('Delete building data?');
          setConfirmMessage(msg);
        } else {
          setConfirmTitle('Remove from list?');
          setConfirmMessage('Are you sure you want to remove this building from your list?');
        }

        setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
        setConfirmOpen(true);
        setIsSaving(false);
        return;
      } catch {
        setConfirmTitle('Remove from list?');
        setConfirmMessage('Are you sure you want to remove this building?');
        setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
        setConfirmOpen(true);
        setIsSaving(false);
        return;
      }
    }

    // Otherwise, just do it (upsert)
    performUpdate(status, successMessage, removeMessage);
  };

  const handleSave = (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    handleAction('pending', 'Saved to your list', 'Removed from your list');
  };

  const handleVisit = (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    handleAction('visited', 'Marked as visited', 'Removed from visited');
  };

  const handleHide = (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    handleAction('ignored', 'Building hidden', 'Building unhidden');
  };

  const handleRate = async (rating: number) => {
    if (!user) return;
    setOptimisticRating(rating);
    try {
      const { error } = await supabase
        .from('user_buildings')
        .update({ rating })
        .eq('user_id', user.id)
        .eq('building_id', buildingId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['user-building-statuses'] });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update rating' });
      setOptimisticRating(null);
    }
  };

  const confirmDelete = () => {
    if (pendingDeletion) pendingDeletion();
  };

  return {
    user,
    isSaved,
    isVisited,
    isIgnored,
    currentRating,
    isSaving,
    justInteracted,
    setJustInteracted,
    handleSave,
    handleVisit,
    handleHide,
    handleRate,
    // confirmation dialog
    confirmOpen,
    setConfirmOpen,
    confirmTitle,
    confirmMessage,
    confirmDelete,
  };
}
