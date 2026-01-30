import { useState, useEffect } from "react";
import { Check, Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface Collection {
  id: string;
  name: string;
  slug: string;
}

interface CollectionSelectorProps {
  userId: string;
  selectedCollectionIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function CollectionSelector({ userId, selectedCollectionIds, onChange, className }: CollectionSelectorProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCollections();
    }
  }, [userId]);

  const fetchCollections = async () => {
    try {
      setLoading(true);

      // Fetch owned collections and collections where user is a contributor
      const [owned, shared] = await Promise.all([
        supabase
          .from("collections")
          .select("id, name, slug")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("collection_contributors")
          .select("collection:collections(id, name, slug)")
          .eq("user_id", userId)
          .neq("role", "viewer")
      ]);

      if (owned.error) throw owned.error;
      if (shared.error) throw shared.error;

      const ownedCollections = (owned.data || []) as Collection[];
      const sharedCollections = (shared.data || [])
        .map((item: any) => item.collection)
        .filter(Boolean) as Collection[];

      // Merge and remove duplicates by ID
      const allCollections = [...ownedCollections, ...sharedCollections];
      const uniqueCollections = Array.from(new Map(allCollections.map(c => [c.id, c])).values());

      setCollections(uniqueCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      setCreating(true);

      // Generate slug
      let slug = newCollectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug) slug = "collection";

      // Ensure uniqueness (simple append)
      const { data: existing } = await supabase.from("collections").select("slug").eq("slug", slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const { data, error } = await supabase
        .from("collections")
        .insert({
          owner_id: userId,
          name: newCollectionName.trim(),
          is_public: true, // Default to public
          slug: slug
        })
        .select("id, name, slug")
        .single();

      if (error) throw error;

      setCollections(prev => [data, ...prev]);
      // Automatically select the new collection
      onChange([...selectedCollectionIds, data.id]);
      setNewCollectionName("");
      toast.success("Collection created");

    } catch (error) {
      console.error("Error creating collection:", error);
      toast.error("Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  const toggleCollection = (id: string) => {
    if (selectedCollectionIds.includes(id)) {
      onChange(selectedCollectionIds.filter(cId => cId !== id));
    } else {
      onChange([...selectedCollectionIds, id]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-xs font-medium uppercase text-muted-foreground">Save to Collections</Label>

      <div className="border rounded-md bg-background">
        <ScrollArea className="h-[140px] p-2">
            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                    No collections yet. Create one below.
                </div>
            ) : (
                <div className="space-y-1">
                    {collections.map(collection => {
                        const isSelected = selectedCollectionIds.includes(collection.id);
                        return (
                            <div
                                key={collection.id}
                                className={cn(
                                    "flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer text-sm transition-colors",
                                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                                )}
                                onClick={() => toggleCollection(collection.id)}
                            >
                                <span className="truncate">{collection.name}</span>
                                {isSelected && <Check className="h-3 w-3 shrink-0" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </ScrollArea>

        <div className="border-t p-2 flex gap-2">
            <Input
                placeholder="New collection name..."
                className="h-8 text-xs"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCollection();
                    }
                }}
                disabled={creating}
            />
            <Button
                size="sm"
                variant="secondary"
                className="h-8 px-2"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || creating}
            >
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            </Button>
        </div>
      </div>
    </div>
  );
}
