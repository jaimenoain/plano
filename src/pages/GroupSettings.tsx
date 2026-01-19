import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationInput } from "@/components/ui/LocationInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Trash2, X, Plus, Link as LinkIcon, Video, MapPin, Tv, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NavigationBlocker } from "@/components/common/NavigationBlocker";
import { parseHomeBase, sanitizeUrl } from "@/lib/utils";

export default function GroupSettings() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [groupSlug, setGroupSlug] = useState("");
  const [isSlugEditable, setIsSlugEditable] = useState(false);
  const [description, setDescription] = useState("");
  const [homeBaseType, setHomeBaseType] = useState<"physical" | "virtual" | "hybrid">("physical");
  // Separate state for physical and virtual
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [virtualLink, setVirtualLink] = useState("");

  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<{ type: string; url: string; label?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [initialState, setInitialState] = useState<{
    name: string;
    groupSlug: string;
    description: string;
    homeBase: string;
    isPublic: boolean;
    coverUrl: string | null;
    links: { type: string; url: string; label?: string }[];
  } | null>(null);

  const { data: group, isLoading } = useQuery({
    queryKey: ["group-settings", slug],
    queryFn: async () => {
      let query = supabase.from("groups").select("*, members:group_members(id), private:group_private_info(home_base)");

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");
      if (isUuid) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (group) {
      setName(group.name);
      setGroupSlug(group.slug || "");
      setDescription(group.description || "");
      // Handle array or object from relation, depending on Supabase version but usually single object if 1:1 and data exists
      // If no data, it might be empty array or null.
      const privateInfo = Array.isArray(group.private) ? group.private[0] : group.private;
      const rawHomeBase = privateInfo?.home_base || "";

      const parsed = parseHomeBase(rawHomeBase);
      setHomeBaseType(parsed.type);

      if (parsed.type === 'physical') {
        setPhysicalAddress(parsed.value);
        setVirtualLink("");
      } else if (parsed.type === 'virtual') {
        setVirtualLink(parsed.value);
        setPhysicalAddress("");
      } else if (parsed.type === 'hybrid') {
        setPhysicalAddress(parsed.physical || "");
        setVirtualLink(parsed.virtual || "");
      }

      setIsPublic(group.is_public ?? true);
      setCoverUrl(group.cover_url);
      const linksVal = (group.links as { type: string; url: string; label?: string }[]) || [];
      setLinks(linksVal);

      setIsSlugEditable(false);
      setInitialState({
        name: group.name,
        groupSlug: group.slug || "",
        description: group.description || "",
        homeBase: rawHomeBase,
        isPublic: group.is_public ?? true,
        coverUrl: group.cover_url,
        links: linksVal,
      });
    }
  }, [group]);

  const isDirty = (() => {
    if (!initialState) return false;
    if (name !== initialState.name) return true;
    if (groupSlug !== initialState.groupSlug) return true;
    if (description !== initialState.description) return true;

    // Construct current home base string to compare with initial
    let newHomeBaseString = "";
    if (homeBaseType === 'physical') {
        newHomeBaseString = JSON.stringify({ type: 'physical', value: physicalAddress });
    } else if (homeBaseType === 'virtual') {
        newHomeBaseString = JSON.stringify({ type: 'virtual', value: sanitizeUrl(virtualLink) });
    } else {
        newHomeBaseString = JSON.stringify({
            type: 'hybrid',
            physical: physicalAddress,
            virtual: sanitizeUrl(virtualLink),
            value: physicalAddress // Primary value for fallback
        });
    }

    if (newHomeBaseString !== initialState.homeBase) {
       // Check if it's effectively the same (legacy case)
       try {
         const initialJson = JSON.parse(initialState.homeBase);
         if (initialJson.type !== homeBaseType) return true;

         if (homeBaseType === 'hybrid') {
             if (initialJson.physical !== physicalAddress || initialJson.virtual !== sanitizeUrl(virtualLink)) return true;
         } else {
             // Physical or Virtual
             const currentValue = homeBaseType === 'physical' ? physicalAddress : sanitizeUrl(virtualLink);
             if (initialJson.value !== currentValue) return true;
         }
       } catch {
         // Initial was not JSON (legacy string = physical).
         // If current is physical and value equals initial, it's effectively same content.
         if (homeBaseType === 'physical') {
             if (physicalAddress !== initialState.homeBase) return true;
         } else {
             // If type changed from legacy string (physical) to something else, it's dirty
             return true;
         }
       }
    }

    if (isPublic !== initialState.isPublic) return true;
    if (coverUrl !== initialState.coverUrl) return true;

    // Compare links array
    if (links.length !== initialState.links.length) return true;
    return JSON.stringify(links) !== JSON.stringify(initialState.links);
  })();

  const handleUploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${group!.id}/${Math.random()}.${fileExt}`;

      if (group?.cover_url) {
        await supabase.storage
          .from("group_covers")
          .remove([group.cover_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from("group_covers")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("group_covers")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("groups")
        .update({ cover_url: filePath })
        .eq("id", group!.id);

      if (updateError) throw updateError;

      setCoverUrl(filePath);
      toast({ title: "Cover image updated" });
      await queryClient.invalidateQueries({ queryKey: ["group-basic"] });
      await queryClient.invalidateQueries({ queryKey: ["group-settings"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error uploading image",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from("groups")
        .update({ cover_url: null })
        .eq("id", group!.id);

      if (error) throw error;

      setCoverUrl(null);
      toast({ title: "Cover image removed" });
      await queryClient.invalidateQueries({ queryKey: ["group-basic"] });
      await queryClient.invalidateQueries({ queryKey: ["group-settings"] });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error removing image",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = () => {
    setLinks([...links, { type: "webpage", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks);
  };

  const handleLinkChange = (index: number, field: keyof typeof links[0], value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleUpdate = async () => {
    if (!group) return;

    // 1. Update basic group info
    const { error: groupError } = await supabase
      .from("groups")
      .update({ 
        name, 
        slug: groupSlug,
        description, 
        is_public: isPublic,
        links: links
      })
      .eq("id", group.id);

    if (groupError) {
      if (groupError.message.includes("unique")) {
         toast({ variant: "destructive", title: "Slug already taken", description: "Please choose a different slug." });
      } else {
         toast({ variant: "destructive", title: "Update failed", description: groupError.message });
      }
      return;
    }

    // 2. Upsert private info (Home Base)
    let homeBaseString = "";
    if (homeBaseType === 'physical') {
        homeBaseString = JSON.stringify({ type: 'physical', value: physicalAddress });
    } else if (homeBaseType === 'virtual') {
        homeBaseString = JSON.stringify({ type: 'virtual', value: sanitizeUrl(virtualLink) });
    } else {
        homeBaseString = JSON.stringify({
            type: 'hybrid',
            physical: physicalAddress,
            virtual: sanitizeUrl(virtualLink),
            value: physicalAddress // Primary value for fallback
        });
    }

    const { error: privateError } = await supabase
      .from("group_private_info")
      .upsert({
        group_id: group.id,
        home_base: homeBaseString
      });

    if (privateError) {
        toast({ variant: "destructive", title: "Settings updated, but private info failed", description: privateError.message });
        // Don't navigate away if partial failure? Or warn?
        // Let's stay to allow retry.
        return;
    }

    // Update initialState so the NavigationBlocker knows we are clean
    setInitialState({
      name,
      groupSlug,
      description,
      homeBase: homeBaseString,
      isPublic,
      coverUrl,
      links,
    });

    await queryClient.invalidateQueries({ queryKey: ["group-basic"] });
    await queryClient.invalidateQueries({ queryKey: ["group-settings"] });
    toast({ title: "Settings updated" });
    navigate(`/groups/${groupSlug}`);
  };

  if (isLoading) return <AppLayout><div>Loading...</div></AppLayout>;

  return (
    <AppLayout title="Group Settings">
      <NavigationBlocker isDirty={isDirty} />
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Group
        </Button>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Group Cover Image</Label>
            <div className="border rounded-lg p-4 space-y-4">
              {coverUrl ? (
                <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border bg-muted">
                   <img
                     src={supabase.storage.from("group_covers").getPublicUrl(coverUrl).data.publicUrl}
                     alt="Group Cover"
                     className="w-full h-full object-cover"
                   />
                   <Button
                     variant="destructive"
                     size="icon"
                     className="absolute top-2 right-2 h-8 w-8"
                     onClick={handleRemoveCover}
                     disabled={uploading}
                   >
                     <X className="h-4 w-4" />
                   </Button>
                </div>
              ) : (
                <div className="aspect-video w-full max-w-sm rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground">
                   <div className="text-center p-4">
                     <p className="text-sm">No cover image set.</p>
                     <p className="text-xs mt-1">Shows latest films by default.</p>
                   </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="relative" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload New Image"}
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleUploadCover}
                    accept="image/*"
                    disabled={uploading}
                  />
                </Button>
                {coverUrl && !uploading && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveCover} className="text-muted-foreground">
                    Reset to Default
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Group Slug (URL)</Label>
            {isSlugEditable ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">cineforum.eu/groups/</span>
                <Input id="slug" value={groupSlug} onChange={(e) => setGroupSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} />
              </div>
            ) : (
              <div className="flex items-center gap-2 h-10">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  cineforum.eu/groups/<span className="text-white font-bold">{groupSlug}</span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => setIsSlugEditable(true)} className="h-6 w-6">
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Unique identifier for your group URL.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Home Base</Label>
            <div className="space-y-3">
              <Select
                value={homeBaseType}
                onValueChange={(v) => setHomeBaseType(v as "physical" | "virtual" | "hybrid")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select default session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> In Person
                    </div>
                  </SelectItem>
                  <SelectItem value="virtual">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> Virtual
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4" /> Hybrid
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(homeBaseType === 'physical' || homeBaseType === 'hybrid') && (
                  <LocationInput
                    value={physicalAddress}
                    onLocationSelected={(address) => setPhysicalAddress(address)}
                    placeholder="Where does the group usually meet?"
                    searchTypes={[]}
                  />
              )}

              {(homeBaseType === 'virtual' || homeBaseType === 'hybrid') && (
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                      value={virtualLink}
                      onChange={(e) => setVirtualLink(e.target.value)}
                      placeholder="https://zoom.us/..."
                      className="pl-9"
                    />
                  </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Visible only to group members.</p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Group Links</Label>
                <p className="text-sm text-muted-foreground">
                  Add external links like website or social media.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>
                <Plus className="h-4 w-4 mr-2" /> Add Link
              </Button>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 border rounded-lg">
                   <div className="space-y-2 flex-1">
                      <Input
                        placeholder="Label (optional)"
                        value={link.label || ""}
                        onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                      />
                      <Input
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                      />
                   </div>
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="text-muted-foreground hover:text-destructive"
                     onClick={() => handleRemoveLink(index)}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))}
              {links.length === 0 && (
                <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground bg-muted/30">
                  No links added yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <span className="text-sm text-muted-foreground">
              Visibility: <span className="font-medium text-foreground">{isPublic ? "Public (can be seen by anyone)" : "Private (only visible to members)"}</span>
            </span>
            <Button variant="link" size="sm" onClick={() => setIsPublic(!isPublic)} className="text-primary px-0 h-auto">
              {isPublic ? "Make private" : "Make public"}
            </Button>
          </div>

          <Button onClick={handleUpdate} className="w-full">Save Changes</Button>

          <div className="pt-8 border-t">
            <h3 className="text-lg font-medium text-white mb-4">Danger Zone</h3>
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-medium text-destructive">Delete Group</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Once you delete a group, there is no going back. Please be certain.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="shrink-0">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the group
                      and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(e) => {

                        const memberCount = group?.members?.length || 0;
                        if (memberCount > 1) {
                            e.preventDefault();
                            toast({
                                variant: "destructive",
                                title: "Cannot delete group",
                                description: "This group has other members. Please transfer admin rights and leave the group, or remove all members first."
                            });
                        } else {
                            // Proceed with delete
                            supabase.from("groups")
                              .delete({ count: 'exact' })
                              .eq("id", group!.id)
                              .then(({ error, count }) => {
                                if (error) {
                                    toast({ variant: "destructive", title: "Error", description: error.message });
                                } else if (count === 0) {
                                    toast({
                                      variant: "destructive",
                                      title: "Cannot delete group",
                                      description: "You do not have permission to delete this group, or it may have already been deleted."
                                    });
                                } else {
                                    toast({ title: "Group deleted" });
                                    navigate("/groups");
                                }
                            });
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
