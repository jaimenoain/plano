import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Share2, Edit2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  slug: string;
  collection_items: { count: number }[];
}

interface CollectionsListProps {
  userId: string;
  selectedSlug: string | null;
  onSelectCollection: (slug: string | null) => void;
  onShare: () => void;
  onManage?: () => void;
  isOwnProfile: boolean;
  refreshKey?: number; // To trigger re-fetch
}

export function CollectionsList({ userId, selectedSlug, onSelectCollection, onShare, onManage, isOwnProfile, refreshKey }: CollectionsListProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchCollections();
    }
  }, [userId, refreshKey]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, collection_items(count)")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCollections(data || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (collections.length === 0 && !isOwnProfile) return null;

  return (
    <div className="flex items-center gap-2 w-full px-4 mb-4">
      <div className="bg-secondary/20 p-1.5 rounded-full mr-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
      </div>
      <ScrollArea className="flex-1 whitespace-nowrap pb-2">
        <div className="flex space-x-2">
          <Badge
            variant={selectedSlug === null ? "default" : "secondary"}
            className="cursor-pointer text-sm py-1 px-3 hover:bg-primary/20 transition-colors"
            onClick={() => onSelectCollection(null)}
          >
            All
          </Badge>
          {collections.map(c => (
            <Badge
              key={c.id}
              variant={selectedSlug === c.slug ? "default" : "secondary"}
              className={cn(
                "cursor-pointer text-sm py-1 px-3 hover:bg-primary/20 transition-colors flex items-center gap-1",
                selectedSlug === c.slug && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              onClick={() => onSelectCollection(selectedSlug === c.slug ? null : c.slug)}
            >
              {c.name}
              <span className="opacity-60 text-xs ml-1">
                {c.collection_items?.[0]?.count || 0}
              </span>
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      <Button variant="ghost" size="icon" onClick={onShare} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground bg-secondary/10 hover:bg-secondary/30 rounded-full" title="Share Profile">
        <Share2 className="h-4 w-4" />
      </Button>

      {isOwnProfile && onManage && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground bg-secondary/10 hover:bg-secondary/30 rounded-full"
          onClick={onManage}
          title="Manage Collections"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
