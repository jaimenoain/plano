import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Loader2, ArrowLeft, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/features/collections/components/CollectionCard";
import { ManageFoldersDialog } from "@/features/profile/components/ManageFoldersDialog";
import { MetaHead } from "@/components/common/MetaHead";
import { useAuth } from "@/features/auth/hooks/useAuth";
export default function FolderView() {
    const { username, slug } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, loading: authLoading } = useAuth();
    const [folder, setFolder] = useState(null);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            if (folderError)
                throw folderError;
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
            if (itemsError)
                throw itemsError;
            const rows = (itemsData ?? []);
            const fetchedCollections = rows
                .map((item) => {
                const raw = item.collection;
                const c = Array.isArray(raw) ? raw[0] : raw;
                if (!c)
                    return null;
                const isCreator = currentUser?.id === c.owner_id;
                const isContributor = c.collection_contributors?.some((contrib) => contrib.user_id === currentUser?.id);
                const enriched = {
                    ...c,
                    isFavorite: !isCreator && !isContributor,
                };
                return enriched;
            })
                .filter((c) => c !== null);
            const visibleCollections = fetchedCollections.filter((c) => {
                if (isOwner)
                    return true;
                return c.is_public;
            });
            visibleCollections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setCollections(visibleCollections);
        }
        catch (_err) {
            setError("Failed to load folder");
        }
        finally {
            setLoading(false);
        }
    };
    const handleBack = () => {
        navigate(`/profile/${username}`);
    };
    if (loading || authLoading) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) }));
    }
    if (error || !folder) {
        return (_jsx(AppLayout, { title: "Folder Not Found", showLogo: false, showBack: true, children: _jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh] px-4 text-center", children: [_jsx("div", { className: "bg-surface-muted/50 p-6 rounded-full mb-6", children: _jsx(Folder, { className: "h-10 w-10 text-text-secondary" }) }), _jsx("h2", { className: "text-2xl font-bold mb-2", children: "Unavailable" }), _jsx("p", { className: "text-text-secondary max-w-sm mx-auto mb-8", children: error || "This folder does not exist or you don't have permission to view it." }), _jsx(Button, { onClick: handleBack, children: "Back to Profile" })] }) }));
    }
    const isOwner = currentUser?.id === folder.owner_id;
    return (_jsxs(AppLayout, { title: folder.name, showLogo: false, showBack: true, children: [_jsx(MetaHead, { title: `${folder.name} by ${username}`, description: folder.description || `View ${folder.name} folder on Plano.` }), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-text-secondary mb-2 cursor-pointer hover:text-text-primary w-fit", onClick: handleBack, children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back to ", username, "'s Profile"] }), _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-2 flex items-center gap-3 text-text-primary", children: [_jsx(Folder, { className: "h-8 w-8 text-text-secondary" }), folder.name] }), folder.description && (_jsx("p", { className: "text-text-secondary max-w-2xl text-lg", children: folder.description }))] }), isOwner && (_jsx(Button, { variant: "outline", onClick: () => setShowManage(true), children: "Organize Folder" }))] })] }), collections.length > 0 ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4", children: collections.map(collection => (_jsx(CollectionCard, { collection: collection, username: username, className: "w-full" }, collection.id))) })) : (_jsxs("div", { className: "py-20 text-center border-2 border-dashed border-border-default/50 rounded-xl bg-surface-muted/10", children: [_jsx("div", { className: "w-16 h-16 bg-surface-muted/30 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx(Folder, { className: "h-8 w-8 text-text-secondary/50" }) }), _jsx("h3", { className: "text-xl font-medium mb-2", children: "Folder is empty" }), _jsx("p", { className: "text-text-secondary max-w-sm mx-auto mb-6", children: isOwner ? "Add collections to this folder to organize your maps." : "This folder doesn't have any public collections yet." }), isOwner && (_jsx(Button, { onClick: () => setShowManage(true), children: "Organize Folder" }))] }))] }), isOwner && (_jsx(ManageFoldersDialog, { open: showManage, onOpenChange: setShowManage, userId: currentUser.id, initialFolder: folder, onUpdate: () => setRefreshKey(k => k + 1) }))] }));
}
