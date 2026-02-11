import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Globe, Plus, Map as MapIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  created_at: string;
  collection_items: { count: number }[];
  owner?: { username: string | null };
}

interface CollectionsGridProps {
  userId: string;
  username: string | null;
  isOwnProfile: boolean;
  onCreate?: () => void;
  refreshKey?: number;
}

export function CollectionsGrid({ userId, username, isOwnProfile, onCreate, refreshKey }: CollectionsGridProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCollections();
    }
  }, [userId, refreshKey]);

  const fetchCollections = async () => {
    try {
      // 1. Fetch owned collections
      const ownedPromise = supabase
        .from("collections")
        .select("id, name, slug, is_public, created_at, collection_items(count), owner:profiles!collections_owner_id_fkey(username)")
        .eq("owner_id", userId);

      // 2. Fetch contributed collections
      const contributedPromise = supabase
        .from("collections")
        .select("id, name, slug, is_public, created_at, collection_items(count), collection_contributors!inner(user_id), owner:profiles!collections_owner_id_fkey(username)")
        .eq("collection_contributors.user_id", userId);

      const [ownedRes, contributedRes] = await Promise.all([ownedPromise, contributedPromise]);

      if (ownedRes.error) throw ownedRes.error;
      if (contributedRes.error) throw contributedRes.error;

      // Cast to unknown first to handle the extra collection_contributors field in the second query
      const owned = (ownedRes.data || []) as unknown as Collection[];
      const contributed = (contributedRes.data || []) as unknown as Collection[];

      // Merge and deduplicate by ID
      const allCollections = new Map<string, Collection>();

      owned.forEach(c => allCollections.set(c.id, c));
      contributed.forEach(c => allCollections.set(c.id, c));

      // Sort by created_at desc
      const sorted = Array.from(allCollections.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCollections(sorted);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-32 w-full animate-pulse bg-secondary/20 rounded-lg mx-4" />;
  if (collections.length === 0 && !isOwnProfile) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
           <MapIcon className="h-4 w-4 text-muted-foreground" />
           Collections
        </h3>
        {isOwnProfile && onCreate && (
             <Button variant="ghost" size="sm" onClick={onCreate} className="h-8 text-xs text-muted-foreground hover:text-primary">
                 <Plus className="h-3 w-3 mr-1" /> New
             </Button>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-3 px-4 pb-4">
          {/* New Collection Card (Alternate placement, maybe redundent with header button but good for visibility if empty) */}
          {isOwnProfile && collections.length === 0 && onCreate && (
            <button
              onClick={onCreate}
              className="flex-shrink-0 w-[160px] h-[100px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-secondary/50 transition-colors group"
            >
              <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                 <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Create New</span>
            </button>
          )}

          {collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/${collection.owner?.username || username || 'user'}/map/${collection.slug}`}
              className="block flex-shrink-0 w-[180px] group select-none"
            >
              <Card className="h-[100px] hover:border-primary/50 transition-colors overflow-hidden relative">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <h4 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors pr-4 whitespace-normal">
                       {collection.name}
                     </h4>
                     {collection.is_public ? (
                       <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                     ) : (
                       <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                     )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground font-medium">
                      {collection.collection_items?.[0]?.count || 0} places
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
