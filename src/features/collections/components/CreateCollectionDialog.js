import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/utils/url";
import { collectionSchema } from "@/lib/validations/collection";
export function CreateCollectionDialog({ open, onOpenChange, userId, onSuccess }) {
    const { toast } = useToast();
    const [processing, setProcessing] = useState(false);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [folders, setFolders] = useState([]);
    const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        is_public: true
    });
    useEffect(() => {
        if (open) {
            fetchFolders();
        }
        else {
            // Reset state when closed
            setSelectedFolderIds(new Set());
            setFormData({ name: "", description: "", is_public: true });
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
    const handleCreate = async () => {
        const parsed = collectionSchema.safeParse({
            name: formData.name,
            description: formData.description || undefined,
            is_public: formData.is_public,
            external_link: null,
        });
        if (!parsed.success) {
            toast({
                variant: "destructive",
                title: "Validation error",
                description: parsed.error.issues[0]?.message ?? "Invalid collection",
            });
            return;
        }
        setProcessing(true);
        try {
            // Generate slug
            let slug = slugify(parsed.data.name);
            if (!slug)
                slug = "collection";
            // Ensure uniqueness (simple append)
            const { data: existing } = await supabase.from("collections").select("slug").eq("slug", slug).maybeSingle();
            if (existing) {
                slug = `${slug}-${Date.now()}`;
            }
            const { data: newCollection, error } = await supabase.from("collections").insert({
                owner_id: userId,
                name: parsed.data.name,
                description: parsed.data.description ?? null,
                is_public: parsed.data.is_public,
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
            // The useEffect already handles resetting form data on close, but we can do it here too just in case
            setFormData({ name: "", description: "", is_public: true });
            setSelectedFolderIds(new Set());
            onSuccess();
            onOpenChange(false);
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to create collection." });
        }
        finally {
            setProcessing(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "New Collection" }), _jsx(DialogDescription, { children: "Create a new collection to organize your favorite buildings." })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), placeholder: "e.g. Modernist Gems" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "desc", children: "Description" }), _jsx(Textarea, { id: "desc", value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), placeholder: "Optional description...", rows: 3 })] }), _jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "public", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Public Collection" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Visible to everyone on your profile" })] }), _jsx(Switch, { id: "public", checked: formData.is_public, onCheckedChange: (c) => setFormData({ ...formData, is_public: c }) })] }), _jsxs("div", { className: "space-y-3 pt-2", children: [_jsx(Label, { children: "Add to Folders (Optional)" }), loadingFolders ? (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) })) : folders.length === 0 ? (_jsx("p", { className: "text-sm text-text-secondary py-2", children: "No folders found." })) : (_jsx(ScrollArea, { className: "h-[120px] rounded-md border p-2", children: _jsx("div", { className: "space-y-2", children: folders.map(folder => (_jsxs("div", { className: "flex items-center space-x-3 p-1 rounded hover:bg-surface-muted/30", children: [_jsx(Checkbox, { id: `folder-${folder.id}`, checked: selectedFolderIds.has(folder.id), onCheckedChange: () => handleToggleFolder(folder.id) }), _jsx("div", { className: "grid gap-1.5 leading-none flex-1", children: _jsxs("label", { htmlFor: `folder-${folder.id}`, className: "text-sm font-medium leading-none cursor-pointer flex items-center gap-2", children: [_jsx(Folder, { className: "h-4 w-4 text-text-secondary" }), folder.name] }) })] }, folder.id))) }) }))] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: processing, children: "Cancel" }), _jsxs(Button, { onClick: handleCreate, disabled: processing, children: [processing && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Create Collection"] })] })] }) }));
}
