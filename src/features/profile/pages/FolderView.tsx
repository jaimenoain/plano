import { useState, useEffect } from "react";
import { useParams, useNavigate, type MetaFunction } from "react-router";
import { Loader2, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { ManageFoldersDialog } from "@/features/profile/components/ManageFoldersDialog";
import { UserFolder } from "@/features/collections/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { folderLoader } from "./FolderView.loader";

export { folderLoader as loader };

export const meta: MetaFunction<typeof folderLoader> = ({ loaderData: data }) => {
  if (!data) return [{ title: "Plano" }];
  const { title, description, canonical, ogImage, isPublic } = data;
  const tags = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: canonical },
  ];
  if (!isPublic) {
    tags.push({ name: "robots", content: "noindex, nofollow" });
  }
  return tags;
};

interface Collection {
  id: string;
  name: string;
  slug: string;
  is_public: boolean;
  isFavorite?: boolean;
  created_at: string;
  collection_items: { count: number }[];
  owner?: { username: string | null };
  owner_id?: string;
  collection_contributors?: { user_id: string }[];
}

type FolderCollectionRow = Omit<Collection, "isFavorite"> & {
  owner_id?: string;
  collection_contributors?: { user_id: string }[];
};

type FolderItemRow = {
  collection: FolderCollectionRow | FolderCollectionRow[] | null;
};

export default function FolderView() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [folder, setFolder] = useState<UserFolder | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showManage, setShowManage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (username && slug && !authLoading) {
      fetchData();
    }
  }, [username, slug, refreshKey, authLoading, currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        // 1. Get User ID
        const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("id, username")
            .ilike("username", username || "")
            .maybeSingle();

        if (userError || !userData) {
            setError("User not found");
            setLoading(false);
            return;
        }

        const userId = userData.id;
        const isOwner = currentUser?.id === userId;

        // 2. Get Folder
        const folderQuery = supabase
            .from("user_folders")
            .select("*")
            .eq("owner_id", userId)
            .eq("slug", slug || "")
            .maybeSingle();

        const { data: folderData, error: folderError } = await folderQuery;

        if (folderError) throw folderError;

        if (!folderData) {
             setError("Folder not found");
             setLoading(false);
             return;
        }

        if (!folderData.is_public && !isOwner) {
             setError("This folder is private");
             setLoading(false);
             return;
        }

        setFolder(folderData);

        // 3. Get Collections
        const { data: itemsData, error: itemsError } = await supabase
            .from("user_folder_items")
            .select(`
                collection:collections (
                    id, name, slug, is_public, created_at, owner_id,
                    collection_items(count),
                    collection_contributors(user_id),
                    owner:profiles!collections_owner_id_fkey(username)
                )
            `)
            .eq("folder_id", folderData.id);

        if (itemsError) throw itemsError;

        const rows = (itemsData ?? []) as unknown as FolderItemRow[];
        const fetchedCollections = rows
            .map((item) => {
                const raw = item.collection;
                const c = Array.isArray(raw) ? raw[0] : raw;
                if (!c) return null;

                const isCreator = currentUser?.id === c.owner_id;
                const isContributor = c.collection_contributors?.some((contrib) => contrib.user_id === currentUser?.id);

                const enriched: Collection = {
                  ...c,
                  isFavorite: !isCreator && !isContributor,
                };

                return enriched;
            })
            .filter((c): c is Collection => c !== null);

        const visibleCollections = fetchedCollections.filter((c) => {
            if (isOwner) return true;
            return c.is_public;
        });

        visibleCollections.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setCollections(visibleCollections);

    } catch (_err: unknown) {
setError("Failed to load folder");
    } finally {
        setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/profile/${username}`);
  };

  if (loading || authLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
          </div>
      );
  }

  if (error || !folder) {
      return (
        <AppLayout title="Folder Not Found" showLogo={false} showBack>
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="bg-surface-muted/50 p-6 rounded-full mb-6">
                    <Folder className="h-10 w-10 text-text-secondary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Unavailable</h2>
                <p className="text-text-secondary max-w-sm mx-auto mb-8">
                    {error || "This folder does not exist or you don't have permission to view it."}
                </p>
                <Button onClick={handleBack}>Back to Profile</Button>
            </div>
        </AppLayout>
      );
  }

  const isOwner = currentUser?.id === folder.owner_id;

  return (
    <AppLayout title={folder.name} showLogo={false} showBack>
       <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
           <header className="mb-10 border-b border-border-default pb-8">
               <button
                 type="button"
                 className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary"
                 onClick={handleBack}
               >
                 ← Back to {username}&apos;s profile
               </button>
               <div className="flex items-start justify-between gap-4">
                   <div className="min-w-0">
                       <p className="mb-2 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                         Collection folder
                       </p>
                       <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight leading-none text-text-primary sm:text-4xl">
                           <Folder className="h-7 w-7 shrink-0 text-text-secondary" aria-hidden />
                           {folder.name}
                       </h1>
                       {folder.description && (
                           <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
                               {folder.description}
                           </p>
                       )}
                   </div>
                   {isOwner && (
                       <Button variant="outline" onClick={() => setShowManage(true)}>
                           Organize Folder
                       </Button>
                   )}
               </div>
           </header>

           {collections.length > 0 ? (
               <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
                   {collections.map(collection => (
                       <CollectionCard
                           key={collection.id}
                           collection={collection}
                           username={username}
                           variant="profile"
                       />
                   ))}
               </div>
           ) : (
               <div className="py-20 text-center border-2 border-dashed border-border-default/50 rounded-none bg-surface-muted/10">
                   <div className="w-16 h-16 bg-surface-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Folder className="h-8 w-8 text-text-secondary/50" />
                   </div>
                   <h3 className="text-xl font-medium mb-2">Folder is empty</h3>
                   <p className="text-text-secondary max-w-sm mx-auto mb-6">
                       {isOwner ? "Add collections to this folder to organize your maps." : "This folder doesn't have any public collections yet."}
                   </p>
                   {isOwner && (
                       <Button onClick={() => setShowManage(true)}>
                           Organize Folder
                       </Button>
                   )}
               </div>
           )}
       </div>

       {isOwner && (
           <ManageFoldersDialog
               open={showManage}
               onOpenChange={setShowManage}
               userId={currentUser.id}
               initialFolder={folder}
               onUpdate={() => setRefreshKey(k => k + 1)}
           />
       )}
    </AppLayout>
  );
}
