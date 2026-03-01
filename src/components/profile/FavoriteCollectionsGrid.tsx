import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, Star, Map as MapIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Collection {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  created_at: string;
  collection_items: { count: number }[];
  owner?: { username: string | null };
}

interface FavoriteCollectionsGridProps {
  userId: string;
}

export function FavoriteCollectionsGrid({ userId }: FavoriteCollectionsGridProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchFavorites();
    }
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("collection_favorites")
        .select(`
          collection:collections(
            id, name, slug, is_public, created_at,
            collection_items(count),
            owner:profiles!collections_owner_id_fkey(username)
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Map the nested structure back to a flat Collection array
      const mappedCollections = (data || [])
        .map((item: any) => item.collection)
        .filter((c: any) => c !== null) as Collection[];

      mappedCollections.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCollections(mappedCollections);
    } catch (error) {
      console.error("Error fetching favorite collections:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-32 w-full animate-pulse bg-secondary/20 rounded-lg mx-4" />;
  if (collections.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center px-4 mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
           <Star className="h-4 w-4 text-muted-foreground fill-yellow-500 stroke-yellow-500" />
           Favorite Collections
        </h3>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-3 px-4 pb-4">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/${collection.owner?.username || 'user'}/map/${collection.slug}`}
              className="block flex-shrink-0 w-[180px] group select-none"
            >
              <Card className="h-[100px] hover:border-primary/50 transition-colors overflow-hidden relative">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <h4 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors pr-4 whitespace-normal">
                       {collection.name}
                     </h4>
                     {collection.is_public ? (
                       <Star className="h-3 w-3 text-muted-foreground shrink-0" />
                     ) : (
                       <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                     )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground font-medium">
                      {collection.collection_items?.[0]?.count || 0} places
                    </span>
                    {collection.owner?.username && (
                        <span className="text-[10px] text-muted-foreground">
                            by {collection.owner.username}
                        </span>
                    )}
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
