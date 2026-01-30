import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Plus, X, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserSearch } from "@/components/groups/UserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collection } from "@/types/collection";

interface CollectionSettingsDialogProps {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface Contributor {
  user_id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function CollectionSettingsDialog({ collection, open, onOpenChange, onUpdate }: CollectionSettingsDialogProps) {
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description || "",
    is_public: collection.is_public,
    show_community_images: collection.show_community_images,
    categorization_method: collection.categorization_method || 'default',
    custom_categories: collection.custom_categories || []
  });
  const [saving, setSaving] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);

  // New Category Input State
  const [newCategory, setNewCategory] = useState({ label: "", color: "#EEFF41" });

  useEffect(() => {
    if (open) {
      setFormData({
        name: collection.name,
        description: collection.description || "",
        is_public: collection.is_public,
        show_community_images: collection.show_community_images,
        categorization_method: collection.categorization_method || 'default',
        custom_categories: collection.custom_categories || []
      });
      fetchContributors();
    }
  }, [open, collection]);

  const fetchContributors = async () => {
    setLoadingContributors(true);
    const { data, error } = await supabase
      .from("collection_contributors")
      .select("user_id, user:profiles(id, username, avatar_url)")
      .eq("collection_id", collection.id);

    if (error) {
      console.error("Error fetching contributors:", error);
    } else {
      setContributors(data as any[]);
    }
    setLoadingContributors(false);
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("collections")
      .update({
        name: formData.name,
        description: formData.description || null,
        is_public: formData.is_public,
        show_community_images: formData.show_community_images,
        categorization_method: formData.categorization_method,
        custom_categories: formData.custom_categories
      })
      .eq("id", collection.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update collection");
    } else {
      toast.success("Collection updated");
      onUpdate();
      onOpenChange(false);
    }
  };

  const handleAddContributor = async (userId: string) => {
    if (contributors.some(c => c.user.id === userId)) {
      toast.error("User is already a contributor");
      return;
    }

    const { error } = await supabase
      .from("collection_contributors")
      .insert({
        collection_id: collection.id,
        user_id: userId
      });

    if (error) {
      console.error("Error adding contributor:", error);
      toast.error("Failed to add contributor");
    } else {
      toast.success("Contributor added");
      fetchContributors();
    }
  };

  const handleRemoveContributor = async (userId: string) => {
    const { error } = await supabase
      .from("collection_contributors")
      .delete()
      .eq("collection_id", collection.id)
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to remove contributor");
    } else {
      toast.success("Contributor removed");
      fetchContributors();
    }
  };

  const addCustomCategory = () => {
    if (!newCategory.label.trim()) return;

    const category = {
        id: crypto.randomUUID(),
        label: newCategory.label.trim(),
        color: newCategory.color
    };

    setFormData(prev => ({
        ...prev,
        custom_categories: [...(prev.custom_categories || []), category]
    }));
    setNewCategory({ label: "", color: "#EEFF41" });
  };

  const removeCustomCategory = (id: string) => {
    setFormData(prev => ({
        ...prev,
        custom_categories: (prev.custom_categories || []).filter(c => c.id !== id)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] sm:h-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Collection Settings</DialogTitle>
          <DialogDescription>Manage your collection preferences and collaborators.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="markers">Markers</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="public-mode" className="flex flex-col space-y-1">
                <span>Public Collection</span>
                <span className="font-normal text-xs text-muted-foreground">Visible to everyone</span>
              </Label>
              <Switch
                id="public-mode"
                checked={formData.is_public}
                onCheckedChange={(c) => setFormData({...formData, is_public: c})}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="community-images" className="flex flex-col space-y-1">
                <span>Show Community Images</span>
                <span className="font-normal text-xs text-muted-foreground">Display images in map and list</span>
              </Label>
              <Switch
                id="community-images"
                checked={formData.show_community_images}
                onCheckedChange={(c) => setFormData({...formData, show_community_images: c})}
              />
            </div>
            <Button onClick={handleSaveGeneral} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </TabsContent>

          <TabsContent value="markers" className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between space-x-2 border-b pb-4">
               <Label htmlFor="cat-method" className="flex flex-col space-y-1">
                  <span>Use Custom Categories</span>
                  <span className="font-normal text-xs text-muted-foreground">Categorize buildings with custom labels and colors</span>
               </Label>
               <Switch
                  id="cat-method"
                  checked={formData.categorization_method === 'custom'}
                  onCheckedChange={(c) => setFormData({...formData, categorization_method: c ? 'custom' : 'default'})}
               />
            </div>

            {formData.categorization_method === 'custom' && (
                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs">Category Name</Label>
                            <Input
                                value={newCategory.label}
                                onChange={(e) => setNewCategory({...newCategory, label: e.target.value})}
                                placeholder="e.g. Must Visit"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={newCategory.color}
                                    onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                                    className="h-9 w-12 p-1 cursor-pointer"
                                />
                            </div>
                        </div>
                        <Button size="sm" onClick={addCustomCategory} disabled={!newCategory.label}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <ScrollArea className="h-[200px] border rounded-md bg-secondary/10 p-2">
                        {formData.custom_categories && formData.custom_categories.length > 0 ? (
                            <div className="space-y-2">
                                {formData.custom_categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between bg-card p-2 rounded-md shadow-sm border">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full border shadow-sm"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span className="text-sm font-medium">{cat.label}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCustomCategory(cat.id)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 opacity-50">
                                <MapPin className="h-6 w-6" />
                                <p>No custom categories yet</p>
                            </div>
                        )}
                    </ScrollArea>

                    <Button onClick={handleSaveGeneral} disabled={saving} className="w-full">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                </div>
            )}

            {formData.categorization_method !== 'custom' && (
                 <div className="text-center py-8 text-muted-foreground text-sm">
                     Buildings are categorized by their default status (Pending, Visited, etc.)
                 </div>
            )}

          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4 py-4 overflow-y-auto flex-1">
             <div className="space-y-2">
                <Label>Add Collaborator</Label>
                <UserSearch
                    onSelect={(id) => handleAddContributor(id)}
                    excludeIds={contributors.map(c => c.user.id)}
                />
             </div>

             <div className="space-y-2">
                <Label>Current Collaborators</Label>
                {loadingContributors ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                ) : contributors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed">
                        No collaborators yet.
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] border rounded-md">
                        <div className="divide-y">
                            {contributors.map(contributor => (
                                <div key={contributor.user.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={contributor.user.avatar_url || undefined} />
                                            <AvatarFallback>{contributor.user.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{contributor.user.username}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemoveContributor(contributor.user.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
