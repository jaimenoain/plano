import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Plus, Map as MapIcon, Folder } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ManageFoldersDialog } from "@/features/profile/components/ManageFoldersDialog";
import { FolderCard } from "@/features/profile/components/FolderCard";
import { CollectionCard } from "./CollectionCard";
import { getBuildingImageUrl } from "@/utils/image";
export function CollectionsGrid({ userId, username, isOwnProfile, onCreate, refreshKey }) {
    const [collections, setCollections] = useState([]);
    const [folders, setFolders] = useState([]);
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
                return;
            }
            const folderRows = (data || []);
            const processedFolders = folderRows.map((folder) => {
                const images = [];
                folder.user_folder_items?.forEach((item) => {
                    item.collection?.collection_items?.forEach((ci) => {
                        const rawUrl = ci.building?.main_image_url;
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
        }
        catch (_err) {
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
            if (ownedRes.error)
                throw ownedRes.error;
            if (contributedRes.error)
                throw contributedRes.error;
            if (organizedRes.error)
                throw organizedRes.error;
            if (favoritesRes.error)
                throw favoritesRes.error;
            // Cast to unknown first to handle the extra collection_contributors field in the second query
            const owned = (ownedRes.data || []);
            const contributed = (contributedRes.data || []);
            const favoriteRows = (favoritesRes.data || []);
            const favorites = favoriteRows
                .map((item) => {
                const c = item.collection;
                return Array.isArray(c) ? c[0] : c;
            })
                .filter((c) => c !== null)
                .map((c) => ({ ...c, isFavorite: true }));
            const organizedItems = (organizedRes.data || []);
            const organizedIds = new Set(organizedItems.map((item) => item.collection_id));
            // Merge and deduplicate by ID
            const allCollections = new Map();
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
            const sorted = Array.from(allCollections.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCollections(sorted);
        }
        catch (_error) {
        }
    };
    if (loading)
        return _jsx("div", { className: "h-32 w-full animate-pulse bg-surface-muted/20 rounded-sm mx-4" });
    if (collections.length === 0 && folders.length === 0 && !isOwnProfile)
        return null;
    return (_jsxs("div", { className: "w-full mb-6", children: [_jsxs("div", { className: "flex items-center justify-between px-4 mb-3", children: [_jsxs("h3", { className: "font-semibold text-lg flex items-center gap-2", children: [_jsx(MapIcon, { className: "h-4 w-4 text-text-secondary" }), "Collections"] }), isOwnProfile && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setShowManageFolders(true), className: "h-8 text-xs text-text-secondary hover:text-brand-primary", children: [_jsx(Folder, { className: "h-3 w-3 mr-1" }), " Organize"] }), onCreate && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: onCreate, className: "h-8 text-xs text-text-secondary hover:text-brand-primary", children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " New"] }))] }))] }), _jsx(ManageFoldersDialog, { open: showManageFolders, onOpenChange: setShowManageFolders, userId: userId, onUpdate: fetchData }), _jsxs(ScrollArea, { className: "w-full whitespace-nowrap mb-6", children: [_jsxs("div", { className: "flex space-x-3 px-4 pb-4", children: [folders.length > 0 && folders.map((folder) => (_jsx(FolderCard, { folder: folder, to: `/${username || "user"}/folders/${folder.slug}`, className: "flex-shrink-0", isDroppable: isOwnProfile }, folder.id))), isOwnProfile && collections.length === 0 && folders.length === 0 && onCreate && (_jsxs("button", { onClick: onCreate, className: "flex-shrink-0 w-[160px] h-[100px] border-2 border-dashed border-border-default rounded-sm flex flex-col items-center justify-center gap-2 hover:bg-surface-muted/50 transition-colors group", children: [_jsx("div", { className: "h-8 w-8 rounded-sm bg-surface-muted flex items-center justify-center group-hover:bg-brand-secondary/30 group-hover:text-brand-primary transition-colors", children: _jsx(Plus, { className: "h-4 w-4" }) }), _jsx("span", { className: "text-sm font-medium text-text-secondary", children: "Create New" })] })), collections.map((collection) => (_jsx(CollectionCard, { collection: collection, username: username, isDragEnabled: isOwnProfile }, collection.id)))] }), _jsx(ScrollBar, { orientation: "horizontal" })] })] }));
}
