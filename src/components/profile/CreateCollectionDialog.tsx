import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/utils/url";
import { UserFolder } from "@/types/collection";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function CreateCollectionDialog({ open, onOpenChange, userId, onSuccess }: CreateCollectionDialogProps) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: true
  });

  useEffect(() => {
    if (open) {
      fetchFolders();
    } else {
      // Reset state when closed
      setSelectedFolderIds(new Set());
      setFormData({ name: "", description: "", is_public: true });
    }
  }, [open]);

  const fetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const { data: userFolders, error } = await supabase
        .from("user_folders")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFolders((userFolders as any[]) || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleToggleFolder = (folderId: string) => {
    const newSet = new Set(selectedFolderIds);
    if (newSet.has(folderId)) {
      newSet.delete(folderId);
    } else {
      newSet.add(folderId);
    }
    setSelectedFolderIds(newSet);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", description: "Name is required." });
      return;
    }

    setProcessing(true);
    try {
      // Generate slug
      let slug = slugify(formData.name);
      if (!slug) slug = "collection";

      // Ensure uniqueness (simple append)
      const { data: existing } = await supabase.from("collections").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const { data: newCollection, error } = await supabase.from("collections").insert({
        owner_id: userId,
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public,
        slug: slug
      }).select().single();

      if (error) throw error;

      // Add to selected folders
      if (selectedFolderIds.size > 0 && newCollection) {
        const folderItemsToInsert = Array.from(selectedFolderIds).map((folderId) => ({
          folder_id: folderId,
          collection_id: newCollection.id,
        }));

        const { error: folderError } = await supabase
          .from("user_folder_items")
          .insert(folderItemsToInsert);

        if (folderError) {
          console.error("Error adding to folders:", folderError);
          toast({ variant: "destructive", description: "Collection created, but failed to add to some folders." });
        }
      }

      toast({ description: "Collection created." });
      // The useEffect already handles resetting form data on close, but we can do it here too just in case
      setFormData({ name: "", description: "", is_public: true });
      setSelectedFolderIds(new Set());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({ variant: "destructive", description: "Failed to create collection." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
          <DialogDescription>
            Create a new collection to organize your favorite buildings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Modernist Gems"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Optional description..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="public" className="flex flex-col space-y-1">
              <span>Public Collection</span>
              <span className="font-normal text-xs text-muted-foreground">Visible to everyone on your profile</span>
            </Label>
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(c) => setFormData({...formData, is_public: c})}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label>Add to Folders (Optional)</Label>
            {loadingFolders ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No folders found.</p>
            ) : (
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <div className="space-y-2">
                  {folders.map(folder => (
                    <div key={folder.id} className="flex items-center space-x-3 p-1 rounded hover:bg-secondary/30">
                      <Checkbox
                        id={`folder-${folder.id}`}
                        checked={selectedFolderIds.has(folder.id)}
                        onCheckedChange={() => handleToggleFolder(folder.id)}
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <label
                          htmlFor={`folder-${folder.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                        >
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          {folder.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
