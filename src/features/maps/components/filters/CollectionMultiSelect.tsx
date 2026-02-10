import React, { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  slug: string;
}

interface CollectionMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export function CollectionMultiSelect({ selectedIds, onChange, className }: CollectionMultiSelectProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch owned collections and collections where user is a contributor
      const [owned, shared] = await Promise.all([
        supabase
          .from("collections")
          .select("id, name, slug")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("collection_contributors")
          .select("collection:collections(id, name, slug)")
          .eq("user_id", user.id)
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

  const toggleCollection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(cId => cId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      <div className="border rounded-md bg-background">
        <ScrollArea className="h-[200px] p-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {collections.length === 0 ? "No collections found." : "No matches found."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCollections.map(collection => {
                const isSelected = selectedIds.includes(collection.id);
                return (
                  <div
                    key={collection.id}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleCollection(collection.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCollection(collection.id)}
                      id={`collection-${collection.id}`}
                    />
                    <Label
                      htmlFor={`collection-${collection.id}`}
                      className="text-sm font-normal cursor-pointer flex-1 truncate"
                    >
                      {collection.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {selectedIds.length > 0 && (
        <div className="text-xs text-muted-foreground px-1">
          {selectedIds.length} collection{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
