import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserSearch } from "@/components/groups/UserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CollectionSettingsDialogProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    show_community_images: boolean;
    owner_id: string;
    rating_mode: string | null;
    rating_source_user_id: string | null;
  };
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
    rating_mode: collection.rating_mode || "viewer",
    rating_source_user_id: collection.rating_source_user_id
  });
  const [saving, setSaving] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{id: string, username: string | null, avatar_url: string | null} | null>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        name: collection.name,
        description: collection.description || "",
        is_public: collection.is_public,
        show_community_images: collection.show_community_images,
        rating_mode: collection.rating_mode || "viewer",
        rating_source_user_id: collection.rating_source_user_id
      });
      fetchContributors();
      fetchOwner();
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

  const fetchOwner = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", collection.owner_id)
      .single();

    if (!error && data) {
        setOwnerProfile(data);
    }
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
        rating_mode: formData.rating_mode,
        rating_source_user_id: formData.rating_mode === 'member' ? formData.rating_source_user_id : null
      } as any) // Casting to any to avoid type check error since columns are new
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

  // Combine owner and contributors for the list
  const allMembers = [
    ...(ownerProfile ? [{ user: ownerProfile }] : []),
    ...contributors
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Collection Settings</DialogTitle>
          <DialogDescription>Manage your collection preferences and collaborators.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="map">Map Display</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
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

          <TabsContent value="collaborators" className="space-y-4 py-4">
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

          <TabsContent value="map" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rating_mode">Pin Categorization Mode</Label>
              <Select
                value={formData.rating_mode}
                onValueChange={(value) => setFormData({...formData, rating_mode: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer's Status (Default)</SelectItem>
                  <SelectItem value="contributors_max">Max Priority (All Contributors)</SelectItem>
                  <SelectItem value="admins_max">Max Priority (Admins/Owner)</SelectItem>
                  <SelectItem value="member">Specific Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines whose visited/pending status is used to color the pins on the map.
              </p>
            </div>

            {formData.rating_mode === 'member' && (
                <div className="space-y-2">
                  <Label htmlFor="rating_source">Select Member</Label>
                  <Select
                    value={formData.rating_source_user_id || undefined}
                    onValueChange={(value) => setFormData({...formData, rating_source_user_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMembers.map(m => (
                          <SelectItem key={m.user.id} value={m.user.id}>
                              <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                      <AvatarImage src={m.user.avatar_url || undefined} />
                                      <AvatarFallback>{m.user.username?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span>{m.user.username}</span>
                              </div>
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            )}

            <Button onClick={handleSaveGeneral} disabled={saving} className="w-full mt-4">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
