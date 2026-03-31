import { useState, useEffect } from "react";
import { Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { slugify } from "@/utils/url";

interface Collection {
  id: string;
  name: string;
  slug: string;
}

type SharedCollectionRow = { collection: Collection | Collection[] | null };

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
      ]);

      if (owned.error) throw owned.error;
      if (shared.error) throw shared.error;

      const ownedCollections = (owned.data || []) as Collection[];
      const sharedRows = (shared.data || []) as unknown as SharedCollectionRow[];
      const sharedCollections = sharedRows
        .map((item) => {
          const c = item.collection;
          return Array.isArray(c) ? c[0] : c;
        })
        .filter((c): c is Collection => Boolean(c));

      // Merge and remove duplicates by ID
      const allCollections = [...ownedCollections, ...sharedCollections];
      const uniqueCollections = Array.from(new Map(allCollections.map(c => [c.id, c])).values());

      setCollections(uniqueCollections);
    } catch (_error) {
} finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      setCreating(true);

      // Generate slug
      let slug = slugify(newCollectionName);
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

    } catch (_error) {
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
      <Label className="text-xs font-medium uppercase text-text-secondary">Save to Collections</Label>

      <div className="border border-border-default rounded-sm bg-surface-card">
        <ScrollArea className="h-[140px] p-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-4 text-xs text-text-secondary">
              No collections yet. Create one below.
            </div>
          ) : (
            <div className="space-y-1">
              {collections.map((collection) => {
                const isSelected = selectedCollectionIds.includes(collection.id);
                return (
                  <button
                    key={collection.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-2 py-1.5 rounded-sm text-left text-sm transition-colors",
                      isSelected
                        ? "bg-brand-secondary text-brand-secondary-foreground font-medium"
                        : "hover:bg-surface-muted text-text-secondary"
                    )}
                    onClick={() => toggleCollection(collection.id)}
                  >
                    <span className="truncate">{collection.name}</span>
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border-default p-2 flex gap-2">
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
