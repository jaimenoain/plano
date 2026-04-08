import { useState, useEffect } from "react";
import { Plus, Map as MapIcon, Folder } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserFolder } from "@/features/collections/types";
import { ManageFoldersDialog } from "@/features/profile/components/ManageFoldersDialog";
import { FolderCard } from "@/features/profile/components/FolderCard";
import { CollectionCard } from "./CollectionCard";
import { getBuildingImageUrl } from "@/utils/image";

interface Collection {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  isFavorite?: boolean;
  created_at: string;
  collection_items: { count: number }[];
  owner?: { username: string | null };
}

type CollectionItemPin = { building?: { hero_image_url?: string | null } | null };
type NestedCollection = {
  collection_items?: CollectionItemPin[] | null;
};
type UserFolderItemRow = {
  collection?: NestedCollection | null;
};
type FolderQueryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  items_count?: { count: number }[];
  user_folder_items?: UserFolderItemRow[] | null;
};

type FavoriteCollectionRow = { collection: Collection | Collection[] | null };

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
                   hero_image_url
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
return;
      }

      const folderRows = (data || []) as FolderQueryRow[];
      const processedFolders: UserFolder[] = folderRows.map((folder) => {
        const images: string[] = [];
        folder.user_folder_items?.forEach((item) => {
            item.collection?.collection_items?.forEach((ci) => {
                const rawUrl = ci.building?.hero_image_url;
                if (rawUrl) {
                  const resolvedUrl = getBuildingImageUrl(rawUrl);
                  if (resolvedUrl && !images.includes(resolvedUrl)) {
                      images.push(resolvedUrl);
                  }
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

    } catch (_err) {
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

      // 4. Fetch favorite collections
      const favoritesPromise = supabase
        .from("collection_favorites")
        .select(`
          collection:collections(
            id, name, slug, is_public, created_at,
            collection_items(count),
            owner:profiles!collections_owner_id_fkey(username)
          )
        `)
        .eq("user_id", userId);

      const [ownedRes, contributedRes, organizedRes, favoritesRes] = await Promise.all([
        ownedPromise,
        contributedPromise,
        organizedQuery,
        favoritesPromise
      ]);

      if (ownedRes.error) throw ownedRes.error;
      if (contributedRes.error) throw contributedRes.error;
      if (organizedRes.error) throw organizedRes.error;
      if (favoritesRes.error) throw favoritesRes.error;

      // Cast to unknown first to handle the extra collection_contributors field in the second query
      const owned = (ownedRes.data || []) as unknown as Collection[];
      const contributed = (contributedRes.data || []) as unknown as Collection[];

      const favoriteRows = (favoritesRes.data || []) as unknown as FavoriteCollectionRow[];
      const favorites = favoriteRows
        .map((item) => {
          const c = item.collection;
          return Array.isArray(c) ? c[0] : c;
        })
        .filter((c): c is Collection => c !== null)
        .map((c) => ({ ...c, isFavorite: true }));

      const organizedItems = (organizedRes.data || []) as { collection_id: string }[];
      const organizedIds = new Set(organizedItems.map((item) => item.collection_id));

      // Merge and deduplicate by ID
      const allCollections = new Map<string, Collection>();

      owned.forEach(c => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      favorites.forEach(c => {
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
    } catch (_error) {
}
  };

  if (loading) return <div className="h-32 w-full animate-pulse bg-surface-muted/20 rounded-sm mx-4" />;
  if (collections.length === 0 && folders.length === 0 && !isOwnProfile) return null;

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
           <MapIcon className="h-4 w-4 text-text-secondary" />
           Collections
        </h3>
        {isOwnProfile && (
            <div className="flex items-center gap-1">
                 <Button variant="ghost" size="sm" onClick={() => setShowManageFolders(true)} className="h-8 text-xs text-text-secondary hover:text-brand-primary">
                     <Folder className="h-3 w-3 mr-1" /> Organize
                 </Button>
                 {onCreate && (
                     <Button variant="ghost" size="sm" onClick={onCreate} className="h-8 text-xs text-text-secondary hover:text-brand-primary">
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

      <ScrollArea className="w-full whitespace-nowrap mb-6">
        <div className="flex space-x-3 px-4 pb-4">
          {folders.length > 0 &&
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                to={`/${username || "user"}/folders/${folder.slug}`}
                className="flex-shrink-0"
                isDroppable={isOwnProfile}
              />
            ))}

          {/* New Collection Card */}
          {isOwnProfile && collections.length === 0 && folders.length === 0 && onCreate && (
            <button
              onClick={onCreate}
              className="flex-shrink-0 w-[160px] h-[100px] border-2 border-dashed border-border-default rounded-sm flex flex-col items-center justify-center gap-2 hover:bg-surface-muted/50 transition-colors group"
            >
              <div className="h-8 w-8 rounded-sm bg-surface-muted flex items-center justify-center group-hover:bg-brand-secondary/30 group-hover:text-brand-primary transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-text-secondary">Create New</span>
            </button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {collections.length > 0 && (
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                username={username}
                isDragEnabled={isOwnProfile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
