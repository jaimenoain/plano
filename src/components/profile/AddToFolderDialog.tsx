
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Folder, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { UserFolder } from "@/types/collection";

interface AddToFolderDialogProps {
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  userId: string;
}

export function AddToFolderDialog({ open, onOpenChange, collectionId, userId, onSuccess }: AddToFolderDialogProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "create">("list");
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    if (open) {
      setView("list");
      fetchFoldersAndStatus();
    }
  }, [open, collectionId]);

  const fetchFoldersAndStatus = async () => {
    setLoading(true);
    try {
      // 1. Fetch user folders
      const { data: userFolders, error: foldersError } = await supabase
        .from("user_folders")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (foldersError) throw foldersError;
      setFolders((userFolders as any[]) || []);

      // 2. Fetch folders where this collection is already present
      const { data: folderItems, error: itemsError } = await supabase
        .from("user_folder_items")
        .select("folder_id")
        .eq("collection_id", collectionId);

      if (itemsError) throw itemsError;

      const currentFolderIds = new Set((folderItems || []).map((item: any) => item.folder_id));
      setSelectedFolderIds(currentFolderIds);

    } catch (error) {
      console.error("Error fetching folders:", error);
      toast({ variant: "destructive", description: "Failed to load folders." });
    } finally {
      setLoading(false);
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

  const handleSave = async () => {
    setProcessing(true);
    try {
      // Get current status again to be safe (or rely on initial fetch if we assume no concurrent edits)
      const { data: currentItems } = await supabase
        .from("user_folder_items")
        .select("folder_id")
        .eq("collection_id", collectionId);

      const currentIds = new Set((currentItems || []).map((i: any) => i.folder_id));
      const targetIds = selectedFolderIds;

      const toAdd = Array.from(targetIds).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !targetIds.has(id));

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_folder_items")
          .insert(toAdd.map(id => ({ folder_id: id, collection_id: collectionId })));
        if (insertError) throw insertError;
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_folder_items")
          .delete()
          .eq("collection_id", collectionId)
          .in("folder_id", toRemove);
        if (deleteError) throw deleteError;
      }

      toast({ description: "Collection updated in folders." });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving to folders:", error);
      toast({ variant: "destructive", description: "Failed to save changes." });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setProcessing(true);
    try {
       // Generate slug
      let slug = newFolderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug) slug = "folder";
      const { data: existing } = await supabase.from("user_folders").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const { data, error } = await supabase.from("user_folders").insert({
        owner_id: userId,
        name: newFolderName,
        is_public: true, // Default to public
        slug: slug
      }).select().single();

      if (error) throw error;

      // Add the new folder to the list and select it
      setFolders([data as any, ...folders]);
      const newSet = new Set(selectedFolderIds);
      newSet.add(data.id);
      setSelectedFolderIds(newSet);

      setView("list");
      setNewFolderName("");
      toast({ description: "Folder created and selected." });

    } catch (error) {
      console.error("Error creating folder:", error);
      toast({ variant: "destructive", description: "Failed to create folder." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === "list" ? "Add to Folder" : "New Folder"}
          </DialogTitle>
          <DialogDescription>
             {view === "list" ? "Select folders to add this collection to." : "Create a new folder to organize your collections."}
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <div className="space-y-4">
            <Button onClick={() => setView("create")} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Create New Folder
            </Button>

            {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <ScrollArea className="h-[300px] pr-4">
                    {folders.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No folders found.</p>
                    ) : (
                        <div className="space-y-2">
                             {folders.map(folder => (
                                 <div key={folder.id} className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/30">
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
                    )}
                </ScrollArea>
            )}

            <DialogFooter>
                <Button onClick={handleSave} disabled={processing || loading}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Travel Ideas"
                />
             </div>
             <DialogFooter className="gap-2 sm:gap-0 mt-4">
                 <Button variant="outline" onClick={() => setView("list")} disabled={processing}>
                     <ArrowLeft className="mr-2 h-4 w-4" /> Back
                 </Button>
                 <Button onClick={handleCreateFolder} disabled={processing || !newFolderName.trim()}>
                     {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Create Folder
                 </Button>
             </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
