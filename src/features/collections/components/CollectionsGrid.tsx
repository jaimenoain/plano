import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Folder, Layers, Map as MapIcon, Plus } from "lucide-react";
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

function CollectionsGridSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="h-3 w-40 max-w-full animate-pulse rounded-sm bg-surface-muted" />
        <div className="h-3 w-full max-w-md animate-pulse rounded-sm bg-surface-muted/70" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {[0, 1, 2].map((k) => (
          <div
            key={k}
            className="h-[108px] min-w-[200px] shrink-0 animate-pulse rounded-sm border border-border-default/40 bg-surface-muted/60"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <div
            key={k}
            className="h-[120px] animate-pulse rounded-sm border border-border-default/40 bg-surface-muted/50"
          />
        ))}
      </div>
    </div>
  );
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
        .limit(5, { foreignTable: "user_folder_items" });

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
          preview_images: images.slice(0, 4),
        };
      });

      setFolders(processedFolders);
    } catch (_err) {
      /* ignore */
    }
  };

  const fetchCollections = async () => {
    try {
      const ownedPromise = supabase
        .from("collections")
        .select("id, name, slug, is_public, created_at, collection_items(count), owner:profiles!collections_owner_id_fkey(username)")
        .eq("owner_id", userId);

      const contributedPromise = supabase
        .from("collections")
        .select("id, name, slug, is_public, created_at, collection_items(count), collection_contributors!inner(user_id), owner:profiles!collections_owner_id_fkey(username)")
        .eq("collection_contributors.user_id", userId);

      let organizedQuery = supabase
        .from("user_folder_items")
        .select("collection_id, user_folders!inner(id, owner_id, is_public)")
        .eq("user_folders.owner_id", userId);

      if (!isOwnProfile) {
        organizedQuery = organizedQuery.eq("user_folders.is_public", true);
      }

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
        favoritesPromise,
      ]);

      if (ownedRes.error) throw ownedRes.error;
      if (contributedRes.error) throw contributedRes.error;
      if (organizedRes.error) throw organizedRes.error;
      if (favoritesRes.error) throw favoritesRes.error;

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

      const allCollections = new Map<string, Collection>();

      owned.forEach((c) => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      favorites.forEach((c) => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      contributed.forEach((c) => {
        if (!organizedIds.has(c.id)) {
          allCollections.set(c.id, c);
        }
      });

      const sorted = Array.from(allCollections.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCollections(sorted);
    } catch (_error) {
      /* ignore */
    }
  };

  const profileSlug = username || "user";
  const hasFolders = folders.length > 0;
  const hasLooseCollections = collections.length > 0;
  const isEmpty = !hasFolders && !hasLooseCollections;

  if (loading) {
    return <CollectionsGridSkeleton />;
  }

  if (isEmpty && !isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <Layers className="mb-5 h-8 w-8 text-text-disabled" strokeWidth={1.25} />
        <p className="text-base font-semibold tracking-tight text-text-primary">No public collections</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          This member hasn&apos;t shared any curated lists yet, or they&apos;re only visible to them.
        </p>
      </div>
    );
  }

  if (isEmpty && isOwnProfile) {
    return (
      <div className="space-y-8">
        <ManageFoldersDialog open={showManageFolders} onOpenChange={setShowManageFolders} userId={userId} onUpdate={fetchData} />

        <div className="border border-border-default bg-surface-muted px-4 py-12 text-center sm:px-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-border-default bg-surface-card">
            <MapIcon className="h-7 w-7 text-text-secondary" strokeWidth={1.25} />
          </div>
          <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">Curated lists</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">Start a collection</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
            Save buildings into shareable maps, keep private lists for trips, and organize everything into folders when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            {onCreate && (
              <Button type="button" size="lg" className="min-w-[200px]" onClick={onCreate}>
                New collection
              </Button>
            )}
            <button
              type="button"
              className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              onClick={() => setShowManageFolders(true)}
            >
              Organize folders →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 pb-8">
      <ManageFoldersDialog open={showManageFolders} onOpenChange={setShowManageFolders} userId={userId} onUpdate={fetchData} />

      {/* Intro + actions */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">Curated lists</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            {isOwnProfile
              ? "Maps of buildings you’ve saved — public or private — plus favourites and collaborations. Drag a collection onto a folder to organize."
              : "Public maps and folders this member chose to share."}
          </p>
        </div>
        {isOwnProfile && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-6">
            <Button type="button" variant="outline" size="sm" className="h-9 border-border-default" onClick={() => setShowManageFolders(true)}>
              <Folder className="mr-1.5 h-3.5 w-3.5" />
              Folders
            </Button>
            {onCreate && (
              <Button type="button" size="sm" className="h-9" onClick={onCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New collection
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Folders — horizontal strip */}
      {hasFolders && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-2xs font-medium uppercase tracking-widest text-text-disabled">Folders</h3>
            {isOwnProfile && (
              <button
                type="button"
                className="text-2xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                onClick={() => setShowManageFolders(true)}
              >
                Manage →
              </button>
            )}
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  to={`/${profileSlug}/folders/${folder.slug}`}
                  className="w-[min(220px,85vw)] shrink-0"
                  isDroppable={isOwnProfile}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Loose collections */}
      {hasLooseCollections && (
        <section className="space-y-5">
          <h3 className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
            {hasFolders ? "Outside folders" : "Maps & lists"}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                username={username}
                isDragEnabled={isOwnProfile}
                variant="profile"
              />
            ))}
          </div>
        </section>
      )}

      {/* Own profile: quick link when content exists */}
      {isOwnProfile && onCreate && !isEmpty && (
        <p className="border-t border-border-default pt-8 text-center text-2xs text-text-disabled">
          Looking for the map editor?{" "}
          <Link className="text-text-secondary underline-offset-4 hover:text-text-primary hover:underline" to="/collections/new">
            Create another list →
          </Link>
        </p>
      )}
    </div>
  );
}
