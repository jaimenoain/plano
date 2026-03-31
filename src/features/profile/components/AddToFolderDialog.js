import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Folder, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { slugify } from "@/utils/url";
export function AddToFolderDialog({ open, onOpenChange, collectionId, userId, onSuccess }) {
    const { toast } = useToast();
    const [view, setView] = useState("list");
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
    const [processing, setProcessing] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    useEffect(() => {
        if (open) {
            setView("list");
            fetchFoldersAndStatus();
        }
    }, [open, collectionId]);
    const fetchFoldersAndStatus = async () => {
        setLoading(true);
        try {
            // 1. Fetch user folders
            const { data: userFolders, error: foldersError } = await supabase
                .from("user_folders")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });
            if (foldersError)
                throw foldersError;
            setFolders(userFolders ?? []);
            // 2. Fetch folders where this collection is already present
            const { data: folderItems, error: itemsError } = await supabase
                .from("user_folder_items")
                .select("folder_id")
                .eq("collection_id", collectionId);
            if (itemsError)
                throw itemsError;
            const currentFolderIds = new Set((folderItems ?? []).map((item) => item.folder_id));
            setSelectedFolderIds(currentFolderIds);
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to load folders." });
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggleFolder = (folderId) => {
        const newSet = new Set(selectedFolderIds);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        }
        else {
            newSet.add(folderId);
        }
        setSelectedFolderIds(newSet);
    };
    const handleSave = async () => {
        setProcessing(true);
        try {
            // Get current status again to be safe (or rely on initial fetch if we assume no concurrent edits)
            const { data: currentItems } = await supabase
                .from("user_folder_items")
                .select("folder_id")
                .eq("collection_id", collectionId);
            const currentIds = new Set((currentItems ?? []).map((i) => i.folder_id));
            const targetIds = selectedFolderIds;
            const toAdd = Array.from(targetIds).filter(id => !currentIds.has(id));
            const toRemove = Array.from(currentIds).filter(id => !targetIds.has(id));
            if (toAdd.length > 0) {
                const { error: insertError } = await supabase
                    .from("user_folder_items")
                    .insert(toAdd.map(id => ({ folder_id: id, collection_id: collectionId })));
                if (insertError)
                    throw insertError;
            }
            if (toRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from("user_folder_items")
                    .delete()
                    .eq("collection_id", collectionId)
                    .in("folder_id", toRemove);
                if (deleteError)
                    throw deleteError;
            }
            toast({ description: "Collection updated in folders." });
            onOpenChange(false);
            if (onSuccess)
                onSuccess();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to save changes." });
        }
        finally {
            setProcessing(false);
        }
    };
    const handleCreateFolder = async () => {
        if (!newFolderName.trim())
            return;
        setProcessing(true);
        try {
            // Generate slug
            let slug = slugify(newFolderName);
            if (!slug)
                slug = "folder";
            const { data: existing } = await supabase.from("user_folders").select("slug").eq("slug", slug).maybeSingle();
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }
            const { data, error } = await supabase.from("user_folders").insert({
                owner_id: userId,
                name: newFolderName,
                is_public: true, // Default to public
                slug: slug
            }).select().single();
            if (error)
                throw error;
            // Add the new folder to the list and select it
            setFolders([data, ...folders]);
            const newSet = new Set(selectedFolderIds);
            newSet.add(data.id);
            setSelectedFolderIds(newSet);
            setView("list");
            setNewFolderName("");
            toast({ description: "Folder created and selected." });
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to create folder." });
        }
        finally {
            setProcessing(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: view === "list" ? "Add to Folder" : "New Folder" }), _jsx(DialogDescription, { children: view === "list" ? "Select folders to add this collection to." : "Create a new folder to organize your collections." })] }), view === "list" ? (_jsxs("div", { className: "space-y-4", children: [_jsxs(Button, { onClick: () => setView("create"), variant: "outline", className: "w-full", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Create New Folder"] }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : (_jsx(ScrollArea, { className: "h-[300px] pr-4", children: folders.length === 0 ? (_jsx("p", { className: "text-center py-8 text-text-secondary", children: "No folders found." })) : (_jsx("div", { className: "space-y-2", children: folders.map(folder => (_jsxs("div", { className: "flex items-center space-x-3 p-2 rounded hover:bg-surface-muted/30", children: [_jsx(Checkbox, { id: `folder-${folder.id}`, checked: selectedFolderIds.has(folder.id), onCheckedChange: () => handleToggleFolder(folder.id) }), _jsx("div", { className: "grid gap-1.5 leading-none flex-1", children: _jsxs("label", { htmlFor: `folder-${folder.id}`, className: "text-sm font-medium leading-none cursor-pointer flex items-center gap-2", children: [_jsx(Folder, { className: "h-4 w-4 text-text-secondary" }), folder.name] }) })] }, folder.id))) })) })), _jsx(DialogFooter, { children: _jsxs(Button, { onClick: handleSave, disabled: processing || loading, children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Save"] }) })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "folder-name", children: "Folder Name" }), _jsx(Input, { id: "folder-name", value: newFolderName, onChange: (e) => setNewFolderName(e.target.value), placeholder: "e.g. Travel Ideas" })] }), _jsxs(DialogFooter, { className: "gap-2 sm:gap-0 mt-4", children: [_jsxs(Button, { variant: "outline", onClick: () => setView("list"), disabled: processing, children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] }), _jsxs(Button, { onClick: handleCreateFolder, disabled: processing || !newFolderName.trim(), children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Create Folder"] })] })] }))] }) }));
}
