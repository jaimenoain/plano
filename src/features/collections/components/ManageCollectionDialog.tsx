import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, Folder } from "lucide-react";
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
import { slugify } from "@/utils/url";
import { UserFolder } from "@/types/collection";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  slug: string;
}

interface ManageCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onUpdate?: () => void;
}

export function ManageCollectionDialog({ open, onOpenChange, userId, onUpdate }: ManageCollectionDialogProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: true
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchCollections();
      fetchFolders();
      setView("list");
    } else {
      setSelectedFolderIds(new Set());
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

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast({ variant: "destructive", description: "Failed to load collections." });
    } finally {
      setLoading(false);
    }
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
      setView("list");
      fetchCollections();
      setSelectedFolderIds(new Set());
      onUpdate?.();
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({ variant: "destructive", description: "Failed to create collection." });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from("collections").update({
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public
      }).eq("id", editingId);

      if (error) throw error;

      toast({ description: "Collection updated." });
      setView("list");
      fetchCollections();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating collection:", error);
      toast({ variant: "destructive", description: "Failed to update collection." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("collections").delete().eq("id", deleteId);
      if (error) throw error;

      toast({ description: "Collection deleted." });
      fetchCollections();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast({ variant: "destructive", description: "Failed to delete collection." });
    } finally {
      setProcessing(false);
      setDeleteId(null);
    }
  };

  const startCreate = () => {
    setFormData({ name: "", description: "", is_public: true });
    setView("create");
  };

  const startEdit = (c: Collection) => {
    setFormData({
      name: c.name,
      description: c.description || "",
      is_public: c.is_public
    });
    setEditingId(c.id);
    setView("edit");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {view === "list" && "Manage Collections"}
              {view === "create" && "New Collection"}
              {view === "edit" && "Edit Collection"}
            </DialogTitle>
            <DialogDescription>
              {view === "list" && "Create and manage your collections."}
              {view === "create" && "Create a new collection to organize your favorite buildings."}
              {view === "edit" && "Update collection details."}
            </DialogDescription>
          </DialogHeader>

          {view === "list" ? (
            <div className="space-y-4">
              <Button onClick={startCreate} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Create New Collection
              </Button>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : collections.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No collections found.</p>
              ) : (
                <ScrollArea className="h-[40vh]">
                  <div className="space-y-2 p-1">
                    {collections.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{c.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.is_public ? "Public" : "Private"} • {c.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="space-y-4">
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

              {view === "create" && (
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
              )}

              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                 <Button variant="outline" onClick={() => setView("list")} disabled={processing}>
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back
                 </Button>
                 <Button onClick={view === "create" ? handleCreate : handleUpdate} disabled={processing}>
                   {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {view === "create" ? "Create" : "Save Changes"}
                 </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection? This action cannot be undone. Items in the collection will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
