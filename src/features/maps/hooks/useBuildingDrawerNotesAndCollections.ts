/**
 * useBuildingDrawerNotesAndCollections.ts
 *
 * Owns the inline note editor + collection-membership state and their Supabase
 * mutations for BuildingDrawerBody. Extracted so the drawer body stays under
 * its size budget; behaviour is unchanged.
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Params {
  buildingId: string;
  user: { id: string } | null | undefined;
  isVisited: boolean;
  isSaved: boolean;
  isIgnored: boolean;
  existingPost: { id: string; body: string | null } | null;
  initialCollectionIds: string[] | undefined;
}

export function useBuildingDrawerNotesAndCollections({
  buildingId,
  user,
  isVisited,
  isSaved,
  isIgnored,
  existingPost,
  initialCollectionIds,
}: Params) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Notes ──
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => {
    setNoteDraft(existingPost?.body ?? '');
  }, [existingPost?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Collections ──
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  useEffect(() => {
    if (initialCollectionIds) setCollectionIds(initialCollectionIds);
  }, [initialCollectionIds]);

  const openNoteEditor = () => {
    setNoteDraft(existingPost?.body ?? '');
    setNoteOpen(true);
    setCollectionsOpen(false);
  };

  const saveNote = async () => {
    if (!user) return;
    setSavingNote(true);
    const statusToUse = isVisited ? 'visited' : isSaved ? 'pending' : isIgnored ? 'ignored' : 'visited';
    try {
      await supabase.from('user_buildings').upsert(
        { user_id: user.id, building_id: buildingId, status: statusToUse },
        { onConflict: 'user_id, building_id' },
      );
      if (existingPost) {
        const { error } = await supabase
          .from('building_posts')
          .update({ body: noteDraft, updated_at: new Date().toISOString() })
          .eq('id', existingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('building_posts')
          .insert({ user_id: user.id, building_id: buildingId, body: noteDraft });
        if (error) throw error;
      }
      toast({ title: 'Note saved' });
      setNoteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['building-drawer', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['user-building-statuses'] });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save note' });
    } finally {
      setSavingNote(false);
    }
  };

  const onCollectionsChange = async (newIds: string[]) => {
    if (!user) return;
    const prev = collectionIds;
    const added = newIds.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !newIds.includes(id));
    setCollectionIds(newIds); // optimistic
    try {
      if (added.length > 0) {
        const { error } = await supabase
          .from('collection_items')
          .insert(added.map((cId) => ({ collection_id: cId, building_id: buildingId })));
        if (error) throw error;
      }
      if (removed.length > 0) {
        const { error } = await supabase
          .from('collection_items')
          .delete()
          .in('collection_id', removed)
          .eq('building_id', buildingId);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['building-drawer', buildingId] });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update collection' });
      setCollectionIds(prev); // revert
    }
  };

  return {
    noteOpen,
    setNoteOpen,
    noteDraft,
    setNoteDraft,
    savingNote,
    openNoteEditor,
    saveNote,
    collectionIds,
    collectionsOpen,
    setCollectionsOpen,
    onCollectionsChange,
  };
}
