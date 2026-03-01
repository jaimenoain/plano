import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, Star, Users, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UserFolder } from "@/types/collection";
import { slugify } from "@/utils/url";

interface ManageFoldersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onUpdate?: () => void;
  initialFolder?: UserFolder;
}

interface AvailableCollection {
  id: string;
  name: string;
  is_public: boolean;
  source: 'owned' | 'contributed' | 'favorite';
}

export function ManageFoldersDialog({ open, onOpenChange, userId, onUpdate, initialFolder }: ManageFoldersDialogProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "create" | "edit" | "manage_items">("list");
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: true
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Manage Items State
  const [activeFolder, setActiveFolder] = useState<UserFolder | null>(null);
  const [availableCollections, setAvailableCollections] = useState<AvailableCollection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
      if (initialFolder) {
        handleManageContents(initialFolder);
      } else {
        setView("list");
        setActiveFolder(null);
      }
    }
  }, [open]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_folders")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Cast the result to UserFolder[] because select("*") might not infer everything perfectly or types might be loose
      setFolders((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast({ variant: "destructive", description: "Failed to load folders." });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCollections = async () => {
    try {
      // 1. Fetch owned collections
      const ownedPromise = supabase
        .from("collections")
        .select("id, name, is_public")
        .eq("owner_id", userId);

      // 2. Fetch contributed collections
      const contributedPromise = supabase
        .from("collections")
        .select("id, name, is_public, collection_contributors!inner(user_id)")
        .eq("collection_contributors.user_id", userId);

      // 3. Fetch favorite collections
      const favoritesPromise = supabase
        .from("collection_favorites")
        .select("collection:collections(id, name, is_public)")
        .eq("user_id", userId);

      const [ownedRes, contributedRes, favoritesRes] = await Promise.all([
        ownedPromise,
        contributedPromise,
        favoritesPromise
      ]);

      const collectionMap = new Map<string, AvailableCollection>();

      // Add owned
      (ownedRes.data || []).forEach((c: any) => {
        collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'owned' });
      });

      // Add contributed (if not already owned, though shouldn't happen)
      (contributedRes.data || []).forEach((c: any) => {
        if (!collectionMap.has(c.id)) {
            collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'contributed' });
        }
      });

      // Add favorites
      (favoritesRes.data || []).forEach((item: any) => {
         const c = item.collection;
         if (c && !collectionMap.has(c.id)) {
             collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'favorite' });
         }
      });

      setAvailableCollections(Array.from(collectionMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

    } catch (error) {
      console.error("Error fetching available collections:", error);
    }
  };

  const fetchFolderItems = async (folderId: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_folder_items")
        .select("collection_id")
        .eq("folder_id", folderId);

      if (error) throw error;

      const ids = new Set((data || []).map((item: any) => item.collection_id));
      setSelectedCollectionIds(ids);
    } catch (error) {
      console.error("Error fetching folder items:", error);
      toast({ variant: "destructive", description: "Failed to load folder contents." });
    } finally {
      setItemsLoading(false);
    }
  };

  const handleManageContents = async (folder: UserFolder) => {
    setActiveFolder(folder);
    setView("manage_items");
    setItemsLoading(true);
    // Fetch collections and current items
    await Promise.all([fetchAvailableCollections(), fetchFolderItems(folder.id)]);
    setItemsLoading(false);
  };

  const toggleCollection = (id: string) => {
    const newSet = new Set(selectedCollectionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCollectionIds(newSet);
  };

  const handleSaveItems = async () => {
    if (!activeFolder) return;
    setProcessing(true);
    try {
      // Get current items to diff
      const { data: currentItems } = await supabase
        .from("user_folder_items")
        .select("collection_id")
        .eq("folder_id", activeFolder.id);

      const currentIds = new Set((currentItems || []).map((i: any) => i.collection_id));
      const targetIds = selectedCollectionIds;

      const toAdd = Array.from(targetIds).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !targetIds.has(id));

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_folder_items")
          .insert(toAdd.map(id => ({ folder_id: activeFolder.id, collection_id: id })));
        if (insertError) throw insertError;
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_folder_items")
          .delete()
          .eq("folder_id", activeFolder.id)
          .in("collection_id", toRemove);
        if (deleteError) throw deleteError;
      }

      toast({ description: "Folder contents updated." });
      setView("list");
      fetchFolders(); // refresh counts
      onUpdate?.();
    } catch (error) {
       console.error("Error saving items:", error);
       toast({ variant: "destructive", description: "Failed to save changes." });
    } finally {
      setProcessing(false);
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
      if (!slug) slug = "folder";

      // Ensure uniqueness (simple append)
      const { data: existing } = await supabase.from("user_folders").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const { error } = await supabase.from("user_folders").insert({
        owner_id: userId,
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public,
        slug: slug
      });

      if (error) throw error;

      toast({ description: "Folder created." });
      setView("list");
      fetchFolders();
      onUpdate?.();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({ variant: "destructive", description: "Failed to create folder." });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from("user_folders").update({
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public
      }).eq("id", editingId);

      if (error) throw error;

      toast({ description: "Folder updated." });
      setView("list");
      fetchFolders();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating folder:", error);
      toast({ variant: "destructive", description: "Failed to update folder." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("user_folders").delete().eq("id", deleteId);
      if (error) throw error;

      toast({ description: "Folder deleted." });
      fetchFolders();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({ variant: "destructive", description: "Failed to delete folder." });
    } finally {
      setProcessing(false);
      setDeleteId(null);
    }
  };

  const startCreate = () => {
    setFormData({ name: "", description: "", is_public: true });
    setView("create");
  };

  const startEdit = (f: UserFolder) => {
    setFormData({
      name: f.name,
      description: f.description || "",
      is_public: f.is_public
    });
    setEditingId(f.id);
    setView("edit");
  };

  const renderIcon = (source: string) => {
      switch(source) {
          case 'favorite': return <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />;
          case 'contributed': return <Users className="h-3 w-3 text-blue-500" />;
          default: return null;
      }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {view === "list" && "Manage Folders"}
              {view === "create" && "New Folder"}
              {view === "edit" && "Edit Folder"}
              {view === "manage_items" && `Manage ${activeFolder?.name}`}
            </DialogTitle>
            <DialogDescription>
              {view === "list" && "Create and organize your collections into folders."}
              {view === "create" && "Create a new folder to organize your collections."}
              {view === "edit" && "Update folder details."}
              {view === "manage_items" && "Select collections to include in this folder."}
            </DialogDescription>
          </DialogHeader>

          {view === "list" ? (
            <div className="space-y-4">
              <Button onClick={startCreate} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Create New Folder
              </Button>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No folders found.</p>
              ) : (
                <ScrollArea className="h-[40vh]">
                  <div className="space-y-2 p-1">
                    {folders.map(f => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors group cursor-pointer"
                        onClick={() => handleManageContents(f)}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate flex items-center gap-2">
                             <Folder className="h-4 w-4 text-muted-foreground" />
                             {f.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate ml-6">
                            {f.is_public ? "Public" : "Private"} • {f.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => startEdit(f)}>
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : view === "manage_items" ? (
             <div className="space-y-4">
                 {itemsLoading ? (
                     <div className="flex justify-center py-12">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     </div>
                 ) : (
                     <ScrollArea className="h-[50vh] pr-4">
                         <div className="space-y-2">
                             {availableCollections.length === 0 ? (
                                 <p className="text-center text-muted-foreground py-4">No collections found.</p>
                             ) : (
                                 availableCollections.map(c => (
                                     <div key={c.id} className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/30">
                                         <Checkbox
                                             id={`col-${c.id}`}
                                             checked={selectedCollectionIds.has(c.id)}
                                             onCheckedChange={() => toggleCollection(c.id)}
                                         />
                                         <div className="grid gap-1.5 leading-none flex-1">
                                             <label
                                                 htmlFor={`col-${c.id}`}
                                                 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                                             >
                                                 {c.name}
                                                 {renderIcon(c.source)}
                                             </label>
                                             <p className="text-xs text-muted-foreground">
                                                 {c.is_public ? "Public" : "Private"}
                                             </p>
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                     </ScrollArea>
                 )}
                 <DialogFooter className="gap-2 sm:gap-0 mt-4">
                     <Button variant="outline" onClick={() => setView("list")} disabled={processing}>
                         <ArrowLeft className="mr-2 h-4 w-4" /> Back
                     </Button>
                     <Button onClick={handleSaveItems} disabled={processing}>
                         {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Save Changes
                     </Button>
                 </DialogFooter>
             </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Travel 2024"
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
                  <span>Public Folder</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Visible on your profile, but private collections inside will still remain hidden.
                  </span>
                </Label>
                <Switch
                  id="public"
                  checked={formData.is_public}
                  onCheckedChange={(c) => setFormData({...formData, is_public: c})}
                />
              </div>

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
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? This action cannot be undone. Collections inside will not be deleted, just removed from the folder.
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
