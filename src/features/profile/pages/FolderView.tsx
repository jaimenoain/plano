import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/CollectionCard";
import { ManageFoldersDialog } from "@/components/profile/ManageFoldersDialog";
import { UserFolder } from "@/types/collection";
import { MetaHead } from "@/components/common/MetaHead";
import { useAuth } from "@/hooks/useAuth";

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
        let folderQuery = supabase
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

        const fetchedCollections = (itemsData || [])
            .map((item: any) => {
                const c = item.collection;
                if (!c) return null;

                const isCreator = currentUser?.id === c.owner_id;
                const isContributor = c.collection_contributors?.some((contrib: any) => contrib.user_id === currentUser?.id);

                c.isFavorite = !isCreator && !isContributor;

                return c;
            })
            .filter((c: any) => c !== null);

        const visibleCollections = fetchedCollections.filter((c: any) => {
            if (isOwner) return true;
            return c.is_public;
        });

        // Sort by created_at desc
        visibleCollections.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setCollections(visibleCollections);

    } catch (err: any) {
        console.error("Error fetching folder:", err);
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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  if (error || !folder) {
      return (
        <AppLayout title="Folder Not Found" showLogo={false} showBack>
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="bg-secondary/50 p-6 rounded-full mb-6">
                    <Folder className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Unavailable</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8">
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
       <MetaHead
          title={`${folder.name} by ${username}`}
          description={folder.description || `View ${folder.name} folder on Plano.`}
       />

       <div className="max-w-7xl mx-auto px-4 py-6">
           {/* Header */}
           <div className="mb-8">
               <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 cursor-pointer hover:text-foreground w-fit" onClick={handleBack}>
                   <ArrowLeft className="h-4 w-4" />
                   Back to {username}'s Profile
               </div>
               <div className="flex items-start justify-between">
                   <div>
                       <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                           <Folder className="h-8 w-8 text-muted-foreground" />
                           {folder.name}
                       </h1>
                       {folder.description && (
                           <p className="text-muted-foreground max-w-2xl text-lg">
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
           </div>

           {/* Content */}
           {collections.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                   {collections.map(collection => (
                       <CollectionCard
                           key={collection.id}
                           collection={collection}
                           username={username}
                           className="w-full"
                       />
                   ))}
               </div>
           ) : (
               <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-xl bg-secondary/10">
                   <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Folder className="h-8 w-8 text-muted-foreground/50" />
                   </div>
                   <h3 className="text-xl font-medium mb-2">Folder is empty</h3>
                   <p className="text-muted-foreground max-w-sm mx-auto mb-6">
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
