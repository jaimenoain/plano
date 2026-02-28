import React, { useState, useEffect } from "react";
import { Search, Loader2, Folder, Layers } from "lucide-react";
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

interface UserFolder {
  id: string;
  name: string;
  slug: string;
}

interface FolderAndCollectionMultiSelectProps {
  selectedCollectionIds: string[];
  selectedFolderIds: string[];
  onCollectionChange: (ids: string[]) => void;
  onFolderChange: (ids: string[]) => void;
  className?: string;
}

export function FolderAndCollectionMultiSelect({
  selectedCollectionIds,
  selectedFolderIds,
  onCollectionChange,
  onFolderChange,
  className
}: FolderAndCollectionMultiSelectProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [owned, shared, userFolders] = await Promise.all([
        supabase
          .from("collections")
          .select("id, name, slug")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("collection_contributors")
          .select("collection:collections(id, name, slug)")
          .eq("user_id", user.id),

        supabase
          .from("user_folders")
          .select("id, name, slug")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
      ]);

      if (owned.error) throw owned.error;
      if (shared.error) throw shared.error;
      if (userFolders.error) throw userFolders.error;

      const ownedCollections = (owned.data || []) as Collection[];
      const sharedCollections = (shared.data || [])
        .map((item: any) => item.collection)
        .filter(Boolean) as Collection[];

      const allCollections = [...ownedCollections, ...sharedCollections];
      const uniqueCollections = Array.from(new Map(allCollections.map(c => [c.id, c])).values());

      setCollections(uniqueCollections);
      setFolders(userFolders.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (id: string) => {
    if (selectedCollectionIds.includes(id)) {
      onCollectionChange(selectedCollectionIds.filter(cId => cId !== id));
    } else {
      onCollectionChange([...selectedCollectionIds, id]);
    }
  };

  const toggleFolder = (id: string) => {
    if (selectedFolderIds.includes(id)) {
      onFolderChange(selectedFolderIds.filter(fId => fId !== id));
    } else {
      onFolderChange([...selectedFolderIds, id]);
    }
  };

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSelected = selectedCollectionIds.length + selectedFolderIds.length;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search folders & collections..."
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
          ) : (filteredCollections.length === 0 && filteredFolders.length === 0) ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              {(collections.length === 0 && folders.length === 0) ? "No items found." : "No matches found."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFolders.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                    Folders
                  </div>
                  {filteredFolders.map(folder => {
                    const isSelected = selectedFolderIds.includes(folder.id);
                    return (
                      <div
                        key={`folder-${folder.id}`}
                        className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFolder(folder.id)}
                          id={`folder-${folder.id}`}
                        />
                        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Label
                          htmlFor={`folder-${folder.id}`}
                          className="text-sm font-normal cursor-pointer flex-1 truncate"
                        >
                          {folder.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredCollections.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                    Collections
                  </div>
                  {filteredCollections.map(collection => {
                    const isSelected = selectedCollectionIds.includes(collection.id);
                    return (
                      <div
                        key={`collection-${collection.id}`}
                        className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleCollection(collection.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCollection(collection.id)}
                          id={`collection-${collection.id}`}
                        />
                        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
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
            </div>
          )}
        </ScrollArea>
      </div>

      {totalSelected > 0 && (
        <div className="text-xs text-muted-foreground px-1">
          {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
