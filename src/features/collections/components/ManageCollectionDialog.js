import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { slugify } from "@/utils/url";
export function ManageCollectionDialog({ open, onOpenChange, userId, onUpdate }) {
    const { toast } = useToast();
    const [view, setView] = useState("list");
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [folders, setFolders] = useState([]);
    const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
    // Form state
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_public: true
    });
    const [deleteId, setDeleteId] = useState(null);
    useEffect(() => {
        if (open) {
            fetchCollections();
            fetchFolders();
            setView("list");
        }
        else {
            setSelectedFolderIds(new Set());
        }
    }, [open]);
    const fetchFolders = async () => {
        setLoadingFolders(true);
        try {
            const { data: userFolders, error } = await supabase
                .from("user_folders")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            setFolders(userFolders ?? []);
        }
        catch (_error) {
        }
        finally {
            setLoadingFolders(false);
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
    const fetchCollections = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("collections")
                .select("*")
                .eq("owner_id", userId)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            setCollections(data || []);
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to load collections." });
        }
        finally {
            setLoading(false);
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
                slug = "collection";
            // Ensure uniqueness (simple append)
            const { data: existing } = await supabase.from("collections").select("slug").eq("slug", slug).maybeSingle();
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }
            const { data: newCollection, error } = await supabase.from("collections").insert({
                owner_id: userId,
                name: formData.name,
                description: formData.description || null,
                is_public: formData.is_public,
                slug: slug
            }).select().single();
            if (error)
                throw error;
            // Add to selected folders
            if (selectedFolderIds.size > 0 && newCollection) {
                const folderItemsToInsert = Array.from(selectedFolderIds).map((folderId) => ({
                    folder_id: folderId,
                    collection_id: newCollection.id,
                }));
                const { error: folderError } = await supabase
                    .from("user_folder_items")
                    .insert(folderItemsToInsert);
                if (folderError) {
                    toast({ variant: "destructive", description: "Collection created, but failed to add to some folders." });
                }
            }
            toast({ description: "Collection created." });
            setView("list");
            fetchCollections();
            setSelectedFolderIds(new Set());
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to create collection." });
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
            const { error } = await supabase.from("collections").update({
                name: formData.name,
                description: formData.description || null,
                is_public: formData.is_public
            }).eq("id", editingId);
            if (error)
                throw error;
            toast({ description: "Collection updated." });
            setView("list");
            fetchCollections();
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to update collection." });
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
            const { error } = await supabase.from("collections").delete().eq("id", deleteId);
            if (error)
                throw error;
            toast({ description: "Collection deleted." });
            fetchCollections();
            onUpdate?.();
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to delete collection." });
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
    const startEdit = (c) => {
        setFormData({
            name: c.name,
            description: c.description || "",
            is_public: c.is_public
        });
        setEditingId(c.id);
        setView("edit");
    };
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { children: [view === "list" && "Manage Collections", view === "create" && "New Collection", view === "edit" && "Edit Collection"] }), _jsxs(DialogDescription, { children: [view === "list" && "Create and manage your collections.", view === "create" && "Create a new collection to organize your favorite buildings.", view === "edit" && "Update collection details."] })] }), view === "list" ? (_jsxs("div", { className: "space-y-4", children: [_jsxs(Button, { onClick: startCreate, className: "w-full", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Create New Collection"] }), loading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : collections.length === 0 ? (_jsx("p", { className: "text-center py-8 text-text-secondary", children: "No collections found." })) : (_jsx(ScrollArea, { className: "h-[40vh]", children: _jsx("div", { className: "space-y-2 p-1", children: collections.map(c => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg border bg-surface-card hover:bg-surface-muted/50 transition-colors group", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-medium truncate", children: c.name }), _jsxs("p", { className: "text-xs text-text-secondary truncate", children: [c.is_public ? "Public" : "Private", " \u2022 ", c.description || "No description"] })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => startEdit(c), children: _jsx(Edit2, { className: "h-4 w-4 text-text-secondary" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => setDeleteId(c.id), children: _jsx(Trash2, { className: "h-4 w-4 text-feedback-destructive/80" }) })] })] }, c.id))) }) }))] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "e.g. Modernist Gems" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "desc", children: "Description" }), _jsx(Textarea, { id: "desc", value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Optional description...", rows: 3 })] }), _jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "public", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Public Collection" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Visible to everyone on your profile" })] }), _jsx(Switch, { id: "public", checked: formData.is_public, onCheckedChange: (c) => setFormData({ ...formData, is_public: c }) })] }), view === "create" && (_jsxs("div", { className: "space-y-3 pt-2", children: [_jsx(Label, { children: "Add to Folders (Optional)" }), loadingFolders ? (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) })) : folders.length === 0 ? (_jsx("p", { className: "text-sm text-text-secondary py-2", children: "No folders found." })) : (_jsx(ScrollArea, { className: "h-[120px] rounded-md border p-2", children: _jsx("div", { className: "space-y-2", children: folders.map(folder => (_jsxs("div", { className: "flex items-center space-x-3 p-1 rounded hover:bg-surface-muted/30", children: [_jsx(Checkbox, { id: `folder-${folder.id}`, checked: selectedFolderIds.has(folder.id), onCheckedChange: () => handleToggleFolder(folder.id) }), _jsx("div", { className: "grid gap-1.5 leading-none flex-1", children: _jsxs("label", { htmlFor: `folder-${folder.id}`, className: "text-sm font-medium leading-none cursor-pointer flex items-center gap-2", children: [_jsx(Folder, { className: "h-4 w-4 text-text-secondary" }), folder.name] }) })] }, folder.id))) }) }))] })), _jsxs(DialogFooter, { className: "gap-2 sm:gap-0 mt-4", children: [_jsxs(Button, { variant: "outline", onClick: () => setView("list"), disabled: processing, children: [_jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"] }), _jsxs(Button, { onClick: view === "create" ? handleCreate : handleUpdate, disabled: processing, children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), view === "create" ? "Create" : "Save Changes"] })] })] }))] }) }), _jsx(AlertDialog, { open: !!deleteId, onOpenChange: (open) => !open && setDeleteId(null), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete Collection?" }), _jsx(AlertDialogDescription, { children: "Are you sure you want to delete this collection? This action cannot be undone. Items in the collection will not be deleted." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsxs(AlertDialogAction, { onClick: handleDelete, className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90", children: [processing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Delete"] })] })] }) })] }));
}
