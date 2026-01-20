import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, Edit2, X, Check, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onTagsUpdate?: () => void;
}

export function ManageTagsDialog({ open, onOpenChange, userId, onTagsUpdate }: ManageTagsDialogProps) {
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [pinnedTags, setPinnedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTagsAndPreferences();
    }
  }, [open]);

  const fetchTagsAndPreferences = async () => {
    setLoading(true);
    try {
      // Parallel fetch: logs for tags AND profile for pinned tags
      const [logsResult, profileResult] = await Promise.all([
        supabase
          .from("user_buildings")
          .select("tags")
          .eq("user_id", userId)
          .not("tags", "is", null),
        supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", userId)
          .single()
      ]);

      if (logsResult.error) throw logsResult.error;

      // Extract unique tags
      const uniqueTags = new Set<string>();
      logsResult.data?.forEach(row => {
        row.tags?.forEach(tag => uniqueTags.add(tag));
      });

      // Extract pinned tags
      const prefs = (profileResult.data?.notification_preferences as any) || {};
      const pinned = (prefs.pinned_tags as string[]) || [];
      setPinnedTags(pinned);

      // Sort: Pinned first, then alphabetical
      const sortedTags = Array.from(uniqueTags).sort((a, b) => {
        const isPinnedA = pinned.includes(a);
        const isPinnedB = pinned.includes(b);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        return a.localeCompare(b);
      });

      setTags(sortedTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (tag: string) => {
    if (processing) return;
    const isPinned = pinnedTags.includes(tag);
    const newPinned = isPinned
      ? pinnedTags.filter(t => t !== tag)
      : [...pinnedTags, tag];

    // Optimistic update
    setPinnedTags(newPinned);

    // Re-sort local tags state
    setTags(prev => [...prev].sort((a, b) => {
        const isPinnedA = newPinned.includes(a);
        const isPinnedB = newPinned.includes(b);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
        return a.localeCompare(b);
    }));

    try {
      // Fetch current preferences first to avoid overwriting other settings
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPrefs = (data.notification_preferences as any) || {};
      const updatedPrefs = { ...currentPrefs, pinned_tags: newPinned };

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ notification_preferences: updatedPrefs })
        .eq("id", userId);

      if (updateError) throw updateError;

      onTagsUpdate?.(); // Notify parent to refresh if needed

    } catch (error) {
      console.error("Error updating pinned tags:", error);
      toast({ variant: "destructive", description: "Failed to update pinned tags." });
      // Revert on error
      setPinnedTags(pinnedTags);
    }
  };

  const handleRename = async (oldTag: string) => {
    if (processing || !newTagValue.trim() || newTagValue === oldTag) {
      setEditingTag(null);
      return;
    }

    setProcessing(true);
    try {
      // 1. Fetch logs containing the old tag
      const { data: logs, error: fetchError } = await supabase
        .from("user_buildings")
        .select("id, tags")
        .eq("user_id", userId)
        .contains("tags", [oldTag]);

      if (fetchError) throw fetchError;

      if (!logs || logs.length === 0) return;

      // 2. Update each log
      const updates = logs.map(log => {
        const newTags = (log.tags || []).map(t => t === oldTag ? newTagValue.trim() : t);
        // Remove duplicates in case the new tag already existed
        const uniqueNewTags = Array.from(new Set(newTags));

        return supabase
          .from("user_buildings")
          .update({ tags: uniqueNewTags })
          .eq("id", log.id);
      });

      await Promise.all(updates);

      // Update pinned tags if needed
      if (pinnedTags.includes(oldTag)) {
          const { data, error: fetchError } = await supabase
            .from("profiles")
            .select("notification_preferences")
            .eq("id", userId)
            .single();

          if (!fetchError && data) {
              const currentPrefs = (data.notification_preferences as any) || {};
              const currentPinned = (currentPrefs.pinned_tags as string[]) || [];
              const updatedPinned = currentPinned.map(t => t === oldTag ? newTagValue.trim() : t);

              await supabase
                .from("profiles")
                .update({ notification_preferences: { ...currentPrefs, pinned_tags: updatedPinned } })
                .eq("id", userId);
          }
      }

      toast({ description: `Renamed tag "${oldTag}" to "${newTagValue.trim()}"` });
      setEditingTag(null);
      fetchTagsAndPreferences();
      onTagsUpdate?.();
    } catch (error) {
      console.error("Error renaming tag:", error);
      toast({ variant: "destructive", description: "Failed to rename tag." });
    } finally {
      setProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!tagToDelete || processing) return;

    setProcessing(true);
    try {
      // 1. Fetch logs containing the tag
      const { data: logs, error: fetchError } = await supabase
        .from("user_buildings")
        .select("id, tags")
        .eq("user_id", userId)
        .contains("tags", [tagToDelete]);

      if (fetchError) throw fetchError;

      if (!logs || logs.length === 0) return;

      // 2. Update each log
      const updates = logs.map(log => {
        const newTags = (log.tags || []).filter(t => t !== tagToDelete);
        return supabase
          .from("user_buildings")
          .update({ tags: newTags })
          .eq("id", log.id);
      });

      await Promise.all(updates);

      // Remove from pinned tags if present
      if (pinnedTags.includes(tagToDelete)) {
          const { data, error: fetchError } = await supabase
            .from("profiles")
            .select("notification_preferences")
            .eq("id", userId)
            .single();

          if (!fetchError && data) {
              const currentPrefs = (data.notification_preferences as any) || {};
              const currentPinned = (currentPrefs.pinned_tags as string[]) || [];
              const updatedPinned = currentPinned.filter(t => t !== tagToDelete);

              await supabase
                .from("profiles")
                .update({ notification_preferences: { ...currentPrefs, pinned_tags: updatedPinned } })
                .eq("id", userId);
          }
      }

      toast({ description: `Deleted tag "${tagToDelete}"` });
      fetchTagsAndPreferences();
      onTagsUpdate?.();
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast({ variant: "destructive", description: "Failed to delete tag." });
    } finally {
      setProcessing(false);
      setTagToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Rename, delete, or pin tags. Pinned tags appear at the top of your profile.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No tags found.</p>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 p-1">
                {tags.map(tag => (
                  <div key={tag} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 group transition-colors">
                    {editingTag === tag ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={newTagValue}
                          onChange={(e) => setNewTagValue(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(tag);
                            if (e.key === 'Escape') setEditingTag(null);
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={() => handleRename(tag)} disabled={processing}>
                          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => setEditingTag(null)} disabled={processing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm pl-2 flex items-center gap-2">
                          {tag}
                          {pinnedTags.includes(tag) && <Pin className="h-3 w-3 fill-primary text-primary rotate-45" />}
                        </span>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn("h-7 w-7", pinnedTags.includes(tag) ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-primary")}
                            onClick={() => togglePin(tag)}
                            title={pinnedTags.includes(tag) ? "Unpin" : "Pin"}
                            disabled={processing}
                          >
                            <Pin className={cn("h-3 w-3", pinnedTags.includes(tag) && "fill-current rotate-45")} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingTag(tag); setNewTagValue(tag); }}
                            title="Rename"
                            disabled={processing}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setTagToDelete(tag)}
                            title="Delete"
                            disabled={processing}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete}"? This will remove it from all your reviews. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
