import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Search, Loader2, Folder, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
export function FolderAndCollectionMultiSelect({ selectedCollectionIds, selectedFolderIds, onCollectionChange, onFolderChange, className }) {
    const { user } = useAuth();
    const [collections, setCollections] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);
    const fetchData = async () => {
        if (!user)
            return;
        try {
            setLoading(true);
            const [owned, shared, userFolders] = await Promise.all([
                supabase
                    .from("collections")
                    .select("id, name, slug")
                    .eq("owner_id", user.id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("collection_contributors")
                    .select("collection:collections(id, name, slug)")
                    .eq("user_id", user.id),
                supabase
                    .from("user_folders")
                    .select("id, name, slug")
                    .eq("owner_id", user.id)
                    .order("created_at", { ascending: false })
            ]);
            if (owned.error)
                throw owned.error;
            if (shared.error)
                throw shared.error;
            if (userFolders.error)
                throw userFolders.error;
            const ownedCollections = (owned.data || []);
            const sharedRows = (shared.data || []);
            const sharedCollections = sharedRows
                .map((item) => {
                const c = item.collection;
                return Array.isArray(c) ? c[0] : c;
            })
                .filter((c) => Boolean(c));
            const allCollections = [...ownedCollections, ...sharedCollections];
            const uniqueCollections = Array.from(new Map(allCollections.map(c => [c.id, c])).values());
            setCollections(uniqueCollections);
            setFolders(userFolders.data || []);
        }
        catch {
        }
        finally {
            setLoading(false);
        }
    };
    const toggleCollection = (id) => {
        if (selectedCollectionIds.includes(id)) {
            onCollectionChange(selectedCollectionIds.filter(cId => cId !== id));
        }
        else {
            onCollectionChange([...selectedCollectionIds, id]);
        }
    };
    const toggleFolder = (id) => {
        if (selectedFolderIds.includes(id)) {
            onFolderChange(selectedFolderIds.filter(fId => fId !== id));
        }
        else {
            onFolderChange([...selectedFolderIds, id]);
        }
    };
    const filteredCollections = collections.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalSelected = selectedCollectionIds.length + selectedFolderIds.length;
    return (_jsxs("div", { className: cn("space-y-3", className), children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2 top-2.5 h-4 w-4 text-text-secondary" }), _jsx(Input, { placeholder: "Search folders & collections...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-8 h-9" })] }), _jsx("div", { className: "border rounded-md bg-surface-default", children: _jsx(ScrollArea, { className: "h-[200px] p-2", children: loading ? (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) })) : (filteredCollections.length === 0 && filteredFolders.length === 0) ? (_jsx("div", { className: "text-center py-4 text-xs text-text-secondary", children: (collections.length === 0 && folders.length === 0) ? "No items found." : "No matches found." })) : (_jsxs("div", { className: "space-y-4", children: [filteredFolders.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs font-semibold text-text-secondary px-2 py-1 uppercase tracking-wider", children: "Folders" }), filteredFolders.map(folder => {
                                        const isSelected = selectedFolderIds.includes(folder.id);
                                        return (_jsxs("div", { className: "flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-surface-muted/50 cursor-pointer", onClick: () => toggleFolder(folder.id), children: [_jsx(Checkbox, { checked: isSelected, onCheckedChange: () => toggleFolder(folder.id), id: `folder-${folder.id}` }), _jsx(Folder, { className: "h-4 w-4 text-text-secondary shrink-0" }), _jsx(Label, { htmlFor: `folder-${folder.id}`, className: "text-sm font-normal cursor-pointer flex-1 truncate", children: folder.name })] }, `folder-${folder.id}`));
                                    })] })), filteredCollections.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs font-semibold text-text-secondary px-2 py-1 uppercase tracking-wider", children: "Collections" }), filteredCollections.map(collection => {
                                        const isSelected = selectedCollectionIds.includes(collection.id);
                                        return (_jsxs("div", { className: "flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-surface-muted/50 cursor-pointer", onClick: () => toggleCollection(collection.id), children: [_jsx(Checkbox, { checked: isSelected, onCheckedChange: () => toggleCollection(collection.id), id: `collection-${collection.id}` }), _jsx(Layers, { className: "h-4 w-4 text-text-secondary shrink-0" }), _jsx(Label, { htmlFor: `collection-${collection.id}`, className: "text-sm font-normal cursor-pointer flex-1 truncate", children: collection.name })] }, `collection-${collection.id}`));
                                    })] }))] })) }) }), totalSelected > 0 && (_jsxs("div", { className: "text-xs text-text-secondary px-1", children: [totalSelected, " item", totalSelected !== 1 ? 's' : '', " selected"] }))] }));
}
