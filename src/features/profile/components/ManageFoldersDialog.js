import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, Star, Users, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { slugify } from "@/utils/url";
export function ManageFoldersDialog({ open, onOpenChange, userId, onUpdate, initialFolder }) {
    const { toast } = useToast();
    const [view, setView] = useState("list");
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    // Form state
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_public: true
    });
    const [deleteId, setDeleteId] = useState(null);
    // Manage Items State
    const [activeFolder, setActiveFolder] = useState(null);
    const [availableCollections, setAvailableCollections] = useState([]);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState(new Set());
    const [itemsLoading, setItemsLoading] = useState(false);
    useEffect(() => {
        if (open) {
            fetchFolders();
            if (initialFolder) {
                handleManageContents(initialFolder);
            }
            else {
                setView("list");
                setActiveFolder(null);
            }
        }
    }, [open]);
    const fetchFolders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("user_folders")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            // Cast the result to UserFolder[] because select("*") might not infer everything perfectly or types might be loose
            setFolders(data ?? []);
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to load folders." });
        }
        finally {
            setLoading(false);
        }
    };
    const fetchAvailableCollections = async () => {
        try {
            // 1. Fetch owned collections
            const ownedPromise = supabase
                .from("collections")
                .select("id, name, is_public")
                .eq("owner_id", userId);
            // 2. Fetch contributed collections
            const contributedPromise = supabase
                .from("collections")
                .select("id, name, is_public, collection_contributors!inner(user_id)")
                .eq("collection_contributors.user_id", userId);
            // 3. Fetch favorite collections
            const favoritesPromise = supabase
                .from("collection_favorites")
                .select("collection:collections(id, name, is_public)")
                .eq("user_id", userId);
            const [ownedRes, contributedRes, favoritesRes] = await Promise.all([
                ownedPromise,
                contributedPromise,
                favoritesPromise
            ]);
            const collectionMap = new Map();
            // Add owned
            (ownedRes.data ?? []).forEach((c) => {
                collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'owned' });
            });
            (contributedRes.data ?? []).forEach((c) => {
                if (!collectionMap.has(c.id)) {
                    collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'contributed' });
                }
            });
            (favoritesRes.data ?? []).forEach((item) => {
                const raw = item.collection;
                const c = Array.isArray(raw) ? raw[0] : raw;
                if (c && !collectionMap.has(c.id)) {
                    collectionMap.set(c.id, { id: c.id, name: c.name, is_public: c.is_public, source: 'favorite' });
                }
            });
            setAvailableCollections(Array.from(collectionMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        }
        catch (_error) {
        }
    };
    const fetchFolderItems = async (folderId) => {
        setItemsLoading(true);
        try {
            const { data, error } = await supabase
                .from("user_folder_items")
                .select("collection_id")
                .eq("folder_id", folderId);
            if (error)
                throw error;
            const ids = new Set((data ?? []).map((item) => item.collection_id));
            setSelectedCollectionIds(ids);
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to load folder contents." });
        }
        finally {
            setItemsLoading(false);
        }
    };
    const handleManageContents = async (folder) => {
        setActiveFolder(folder);
        setView("manage_items");
        setItemsLoading(true);
        // Fetch collections and current items
        await Promise.all([fetchAvailableCollections(), fetchFolderItems(folder.id)]);
        setItemsLoading(false);
    };
    const toggleCollection = (id) => {
        const newSet = new Set(selectedCollectionIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        }
        else {
            newSet.add(id);
        }
        setSelectedCollectionIds(newSet);
    };
    const handleSaveItems = async () => {
        if (!activeFolder)
            return;
        setProcessing(true);
        try {
            // Get current items to diff
            const { data: currentItems } = await supabase
                .from("user_folder_items")
                .select("collection_id")
                .eq("folder_id", activeFolder.id);
            const currentIds = new Set((currentItems ?? []).map((i) => i.collection_id));
            const targetIds = selectedCollectionIds;
            const toAdd = Array.from(targetIds).filter(id => !currentIds.has(id));
            const toRemove = Array.from(currentIds).filter(id => !targetIds.has(id));
            if (toAdd.length > 0) {
                const { error: insertError } = await supabase
                    .from("user_folder_items")
                    .insert(toAdd.map(id => ({ folder_id: activeFolder.id, collection_id: id })));
                if (insertError)
                    throw insertError;
            }
            if (toRemove.length > 0) {
                const { error: deleteError } = await supabase
                    .from("user_folder_items")
                    .delete()
                    .eq("folder_id", activeFolder.id)
                    .in("collection_id", toRemove);
                if (deleteError)
                    throw deleteError;
            }
            toast({ description: "Folder contents updated." });
            setView("list");
            fetchFolders(); // refresh counts
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to save changes." });
        }
        finally {
            setProcessing(false);
        }
    };
    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast({ variant: "destructive", description: "Name is required." });
            return;
        }
        setProcessing(true);
        try {
            // Generate slug
            let slug = slugify(formData.name);
            if (!slug)
                slug = "folder";
            // Ensure uniqueness (simple append)
            const { data: existing } = await supabase.from("user_folders").select("slug").eq("slug", slug).maybeSingle();
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }
            const { error } = await supabase.from("user_folders").insert({
                owner_id: userId,
                name: formData.name,
                description: formData.description || null,
                is_public: formData.is_public,
                slug: slug
            });
            if (error)
                throw error;
            toast({ description: "Folder created." });
            setView("list");
            fetchFolders();
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to create folder." });
        }
        finally {
            setProcessing(false);
        }
    };
    const handleUpdate = async () => {
        if (!editingId || !formData.name.trim())
            return;
        setProcessing(true);
        try {
            const { error } = await supabase.from("user_folders").update({
                name: formData.name,
                description: formData.description || null,
                is_public: formData.is_public
            }).eq("id", editingId);
            if (error)
                throw error;
            toast({ description: "Folder updated." });
            setView("list");
            fetchFolders();
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to update folder." });
        }
        finally {
            setProcessing(false);
        }
    };
    const handleDelete = async () => {
        if (!deleteId)
            return;
        setProcessing(true);
        try {
            const { error } = await supabase.from("user_folders").delete().eq("id", deleteId);
            if (error)
                throw error;
            toast({ description: "Folder deleted." });
            fetchFolders();
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to delete folder." });
        }
        finally {
            setProcessing(false);
            setDeleteId(null);
        }
    };
    const startCreate = () => {
        setFormData({ name: "", description: "", is_public: true });
        setView("create");
    };
    const startEdit = (f) => {
        setFormData({
            name: f.name,
            description: f.description || "",
            is_public: f.is_public
        });
        setEditingId(f.id);
        setView("edit");
    };
    const renderIcon = (source) => {
        switch (source) {
            case 'favorite':
                return _jsx(Star, { className: "h-3 w-3 text-feedback-warning fill-feedback-warning" });
            case 'contributed':
                return _jsx(Users, { className: "h-3 w-3 text-brand-primary" });
            default: return null;
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: [view === "list" && "Manage Folders", view === "create" && "New Folder", view === "edit" && "Edit Folder", view === "manage_items" && `Manage ${activeFolder?.name}`] }), _jsxs(DialogDescription, { children: [view === "list" && "Create and organize your collections into folders.", view === "create" && "Create a new folder to organize your collections.", view === "edit" && "Update folder details.", view === "manage_items" && "Select collections to include in this folder."] })] }), view === "list" ? (_jsxs("div", { className: "space-y-4", children: [_jsxs(Button, { onClick: startCreate, className: "w-full", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Create New Folder"] }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : folders.length === 0 ? (_jsx("p", { className: "text-center py-8 text-text-secondary", children: "No folders found." })) : (_jsx(ScrollArea, { className: "h-[40vh] [&>[data-radix-scroll-area-viewport]>div]:!block", children: _jsx("div", { className: "space-y-2 p-1", children: folders.map(f => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg border bg-surface-card hover:bg-surface-muted/50 transition-colors group cursor-pointer", onClick: () => handleManageContents(f), children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("h4", { className: "font-medium flex items-center gap-2", children: [_jsx(Folder, { className: "h-4 w-4 text-text-secondary shrink-0" }), _jsx("span", { className: "truncate", children: f.name })] }), _jsxs("p", { className: "text-xs text-text-secondary truncate ml-6", children: [f.is_public ? "Public" : "Private", " \u2022 ", f.description || "No description"] })] }), _jsxs("div", { className: "flex gap-1", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => startEdit(f), children: _jsx(Edit2, { className: "h-4 w-4 text-text-secondary" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => setDeleteId(f.id), children: _jsx(Trash2, { className: "h-4 w-4 text-feedback-destructive/80" }) })] })] }, f.id))) }) }))] })) : view === "manage_items" ? (_jsxs("div", { className: "space-y-4", children: [itemsLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" }) })) : (_jsx(ScrollArea, { className: "h-[50vh] pr-4 [&>[data-radix-scroll-area-viewport]>div]:!block", children: _jsx("div", { className: "space-y-2", children: availableCollections.length === 0 ? (_jsx("p", { className: "text-center text-text-secondary py-4", children: "No collections found." })) : (availableCollections.map(c => (_jsxs("div", { className: "flex items-center space-x-3 p-2 rounded hover:bg-surface-muted/30", children: [_jsx(Checkbox, { id: `col-${c.id}`, checked: selectedCollectionIds.has(c.id), onCheckedChange: () => toggleCollection(c.id) }), _jsxs("div", { className: "grid gap-1.5 leading-none flex-1", children: [_jsxs("label", { htmlFor: `col-${c.id}`, className: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2", children: [c.name, renderIcon(c.source)] }), _jsx("p", { className: "text-xs text-text-secondary", children: c.is_public ? "Public" : "Private" })] })] }, c.id)))) }) })), _jsxs(DialogFooter, { className: "gap-2 sm:gap-0 mt-4", children: [_jsxs(Button, { variant: "outline", onClick: () => setView("list"), disabled: processing, children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] }), _jsxs(Button, { onClick: handleSaveItems, disabled: processing, children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Save Changes"] })] })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "e.g. Travel 2024" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "desc", children: "Description" }), _jsx(Textarea, { id: "desc", value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Optional description...", rows: 3 })] }), _jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "public", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Public Folder" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Visible on your profile, but private collections inside will still remain hidden." })] }), _jsx(Switch, { id: "public", checked: formData.is_public, onCheckedChange: (c) => setFormData({ ...formData, is_public: c }) })] }), _jsxs(DialogFooter, { className: "gap-2 sm:gap-0 mt-4", children: [_jsxs(Button, { variant: "outline", onClick: () => setView("list"), disabled: processing, children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] }), _jsxs(Button, { onClick: view === "create" ? handleCreate : handleUpdate, disabled: processing, children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), view === "create" ? "Create" : "Save Changes"] })] })] }))] }) }), _jsx(AlertDialog, { open: !!deleteId, onOpenChange: (open) => !open && setDeleteId(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete Folder?" }), _jsx(AlertDialogDescription, { children: "Are you sure you want to delete this folder? This action cannot be undone. Collections inside will not be deleted, just removed from the folder." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsxs(AlertDialogAction, { onClick: handleDelete, className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90", children: [processing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Delete"] })] })] }) })] }));
}
