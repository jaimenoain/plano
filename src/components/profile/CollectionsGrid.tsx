import { useState, useEffect } from "react";
import { Plus, Map as MapIcon, Folder } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { UserFolder } from "@/types/collection";
import { ManageFoldersDialog } from "@/components/profile/ManageFoldersDialog";
import { FolderCard } from "@/components/profile/FolderCard";
import { CollectionCard } from "@/components/CollectionCard";

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
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManageFolders, setShowManageFolders] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCollections(), fetchFolders()]);
    setLoading(false);
  };

  const fetchFolders = async () => {
    try {
      let query = supabase
        .from("user_folders")
        .select(`
          id,
          name,
          slug,
          description,
          is_public,
          created_at,
          items_count:user_folder_items(count),
          user_folder_items (
             collection:collections (
               collection_items (
                 building:buildings (
                   main_image_url
                 )
               )
             )
          )
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(5, { foreignTable: 'user_folder_items' });

      if (!isOwnProfile) {
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching folders:", error);
        return;
      }

      const processedFolders: UserFolder[] = (data || []).map((folder: any) => {
        // extract images
        const images: string[] = [];
        folder.user_folder_items?.forEach((item: any) => {
            item.collection?.collection_items?.forEach((ci: any) => {
                const url = ci.building?.main_image_url;
                if (url && !images.includes(url)) {
                    images.push(url);
                }
            });
        });

        return {
          id: folder.id,
          owner_id: userId,
          name: folder.name,
          slug: folder.slug,
          description: folder.description,
          is_public: folder.is_public,
          created_at: folder.created_at,
          items_count: folder.items_count?.[0]?.count || 0,
          preview_images: images.slice(0, 4)
        };
      });

      setFolders(processedFolders);

    } catch (err) {
      console.error("Error in fetchFolders:", err);
    }
  };

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

      // 3. Fetch organized collection IDs (to exclude)
      let organizedQuery = supabase
        .from("user_folder_items")
        .select("collection_id, user_folders!inner(id, owner_id, is_public)")
        .eq("user_folders.owner_id", userId);

      if (!isOwnProfile) {
        organizedQuery = organizedQuery.eq("user_folders.is_public", true);
      }

      const [ownedRes, contributedRes, organizedRes] = await Promise.all([
        ownedPromise,
        contributedPromise,
        organizedQuery
      ]);

      if (ownedRes.error) throw ownedRes.error;
      if (contributedRes.error) throw contributedRes.error;
      if (organizedRes.error) throw organizedRes.error;

      // Cast to unknown first to handle the extra collection_contributors field in the second query
      const owned = (ownedRes.data || []) as unknown as Collection[];
      const contributed = (contributedRes.data || []) as unknown as Collection[];

      // Extract organized collection IDs
      const organizedIds = new Set(
        (organizedRes.data || []).map((item: any) => item.collection_id)
      );

      // Merge and deduplicate by ID
      const allCollections = new Map<string, Collection>();

      owned.forEach(c => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      contributed.forEach(c => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      // Sort by created_at desc
      const sorted = Array.from(allCollections.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCollections(sorted);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  if (loading) return <div className="h-32 w-full animate-pulse bg-secondary/20 rounded-lg mx-4" />;
  if (collections.length === 0 && folders.length === 0 && !isOwnProfile) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
           <MapIcon className="h-4 w-4 text-muted-foreground" />
           Collections
        </h3>
        {isOwnProfile && (
            <div className="flex items-center gap-1">
                 <Button variant="ghost" size="sm" onClick={() => setShowManageFolders(true)} className="h-8 text-xs text-muted-foreground hover:text-primary">
                     <Folder className="h-3 w-3 mr-1" /> Organize
                 </Button>
                 {onCreate && (
                     <Button variant="ghost" size="sm" onClick={onCreate} className="h-8 text-xs text-muted-foreground hover:text-primary">
                         <Plus className="h-3 w-3 mr-1" /> New
                     </Button>
                 )}
            </div>
        )}
      </div>

      <ManageFoldersDialog
        open={showManageFolders}
        onOpenChange={setShowManageFolders}
        userId={userId}
        onUpdate={fetchData}
      />

      {folders.length > 0 && (
        <ScrollArea className={cn("w-full whitespace-nowrap", (collections.length > 0 || folders.length === 0) ? "mb-6" : "")}>
          <div className="flex space-x-3 px-4 pb-4">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                to={`/${username || "user"}/folders/${folder.slug}`}
                className="flex-shrink-0"
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {(collections.length > 0 || folders.length === 0) && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-3 px-4 pb-4">
            {/* New Collection Card */}
            {isOwnProfile && collections.length === 0 && folders.length === 0 && onCreate && (
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
              <CollectionCard
                key={collection.id}
                collection={collection}
                username={username}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
