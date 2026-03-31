import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Plus, X, MapPin, AlertTriangle, Download, Bookmark, LogOut, Sparkles, FolderPlus, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserSearch } from "@/features/profile/components/UserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseLocation } from "@/utils/location";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { AddToFolderDialog } from "@/features/profile/components/AddToFolderDialog";
import { collectionSchema } from "@/lib/validations/collection";
const METHOD_DESCRIPTIONS = {
    uniform: "All pins appear identical, regardless of status or rating.",
    default: "Pins are colored based on your personal status (Visited, Pending, or Unvisited).",
    status: "Pins show if locations have been visited by all selected members (Green), some (Orange), or none (Grey).",
    rating_member: "Pins highlight the highest rating among members: Masterpiece (Gold), Essential (Silver), Impressive (Bronze), or Saved (Blue).",
    custom: "Create custom categories with your own colors to organize locations."
};
export function CollectionSettingsDialog({ collection, open, onOpenChange, onUpdate, showSavedCandidates, onShowSavedCandidatesChange, isOwner = false, canEdit = true, onSaveAll, currentUserId, onPlanRoute }) {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: collection.name,
        description: collection.description || "",
        is_public: collection.is_public,
        external_link: collection.external_link || "",
        show_community_images: collection.show_community_images,
        categorization_method: collection.categorization_method || 'uniform',
        custom_categories: collection.custom_categories || [],
        categorization_selected_members: collection.categorization_selected_members || null
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [contributors, setContributors] = useState([]);
    const [loadingContributors, setLoadingContributors] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showAddToFolder, setShowAddToFolder] = useState(false);
    // New Category Input State
    const [newCategory, setNewCategory] = useState({ label: "", color: "#EEFF41" });
    const [collectionFolders, setCollectionFolders] = useState([]);
    const fetchCollectionFolders = async () => {
        const { data, error } = await supabase
            .from("user_folder_items")
            .select("folder_id, user_folders(id, name)")
            .eq("collection_id", collection.id);
        if (!error && data) {
            const rows = data;
            const mapped = rows
                .map((item) => {
                const uf = item.user_folders;
                const folder = Array.isArray(uf) ? uf[0] : uf;
                return folder ? { id: folder.id, name: folder.name } : null;
            })
                .filter((x) => x !== null);
            setCollectionFolders(mapped);
        }
    };
    useEffect(() => {
        if (open) {
            setFormData({
                name: collection.name,
                description: collection.description || "",
                is_public: collection.is_public,
                external_link: collection.external_link || "",
                show_community_images: collection.show_community_images,
                categorization_method: collection.categorization_method || 'uniform',
                custom_categories: collection.custom_categories || [],
                categorization_selected_members: collection.categorization_selected_members || null
            });
            fetchContributors();
            fetchCollectionFolders();
        }
    }, [open, collection]);
    const fetchContributors = async () => {
        setLoadingContributors(true);
        const { data, error } = await supabase
            .from("collection_contributors")
            .select("user_id, user:profiles(id, username, avatar_url)")
            .eq("collection_id", collection.id);
        if (!error && data) {
            const rows = data;
            setContributors(rows
                .map((row) => {
                const u = Array.isArray(row.user) ? row.user[0] : row.user;
                return u ? { user_id: row.user_id, user: u } : null;
            })
                .filter((c) => c !== null));
        }
        setLoadingContributors(false);
    };
    const handleSaveGeneral = async () => {
        const ext = formData.external_link?.trim();
        const parsed = collectionSchema.safeParse({
            name: formData.name,
            description: formData.description || undefined,
            is_public: formData.is_public,
            external_link: ext ? ext : null,
        });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message ?? "Invalid collection");
            return;
        }
        setSaving(true);
        const { error } = await supabase
            .from("collections")
            .update({
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            is_public: parsed.data.is_public,
            external_link: parsed.data.external_link ?? null,
            show_community_images: formData.show_community_images,
            categorization_method: formData.categorization_method,
            custom_categories: formData.custom_categories,
            categorization_selected_members: formData.categorization_selected_members
        })
            .eq("id", collection.id);
        setSaving(false);
        if (error) {
            toast.error("Failed to update collection");
        }
        else {
            toast.success("Collection updated");
            onUpdate();
            onOpenChange(false);
        }
    };
    const handleAddContributor = async (userId) => {
        if (contributors.some(c => c.user.id === userId)) {
            toast.error("User is already a contributor");
            return;
        }
        const { error } = await supabase
            .from("collection_contributors")
            .insert({
            collection_id: collection.id,
            user_id: userId,
            role: 'editor'
        });
        if (error) {
            toast.error("Failed to add contributor");
        }
        else {
            toast.success("Contributor added");
            fetchContributors();
        }
    };
    const handleRemoveContributor = async (userId) => {
        const { error } = await supabase
            .from("collection_contributors")
            .delete()
            .eq("collection_id", collection.id)
            .eq("user_id", userId);
        if (error) {
            toast.error("Failed to remove contributor");
        }
        else {
            toast.success("Contributor removed");
            fetchContributors();
        }
    };
    const handleLeaveCollection = async () => {
        if (!currentUserId)
            return;
        // Add confirmation
        if (!window.confirm("Are you sure you want to leave this collection? You will lose access to edit it.")) {
            return;
        }
        const { error } = await supabase
            .from("collection_contributors")
            .delete()
            .eq("collection_id", collection.id)
            .eq("user_id", currentUserId);
        if (error) {
            toast.error("Failed to leave collection");
        }
        else {
            toast.success("You have left the collection");
            onOpenChange(false);
            navigate("/profile");
        }
    };
    const addCustomCategory = () => {
        if (!newCategory.label.trim())
            return;
        const category = {
            id: crypto.randomUUID(),
            label: newCategory.label.trim(),
            color: newCategory.color
        };
        setFormData(prev => ({
            ...prev,
            custom_categories: [...(prev.custom_categories || []), category]
        }));
        setNewCategory({ label: "", color: "#EEFF41" });
    };
    const removeCustomCategory = (id) => {
        setFormData(prev => ({
            ...prev,
            custom_categories: (prev.custom_categories || []).filter(c => c.id !== id)
        }));
    };
    const toggleMemberSelection = (userId) => {
        const current = formData.categorization_selected_members || [];
        if (current.includes(userId)) {
            setFormData({ ...formData, categorization_selected_members: current.filter(id => id !== userId) });
        }
        else {
            setFormData({ ...formData, categorization_selected_members: [...current, userId] });
        }
    };
    const handleDeleteCollection = async () => {
        setDeleting(true);
        const { error } = await supabase
            .from("collections")
            .delete()
            .eq("id", collection.id);
        if (error) {
            toast.error("Failed to delete collection");
            setDeleting(false);
        }
        else {
            toast.success("Collection deleted");
            onOpenChange(false);
            navigate("/profile");
        }
    };
    const handleExportData = async () => {
        try {
            setDownloading(true);
            const { data, error } = await supabase
                .from('collection_items')
                .select(`
          note,
          custom_category_id,
          buildings (
            name,
            address,
            city,
            country,
            year_completed,
            location,
            building_architects (
              architects (
                name
              )
            )
          )
        `)
                .eq('collection_id', collection.id);
            if (error)
                throw error;
            if (!data || data.length === 0) {
                toast.info("No items to export");
                return;
            }
            // Generate CSV
            const headers = ['Name', 'Address', 'City', 'Country', 'Year', 'Latitude', 'Longitude', 'Architects', 'Note', 'Category'];
            const exportRows = data;
            const rows = exportRows.map((item) => {
                const bRaw = item.buildings;
                const building = Array.isArray(bRaw) ? bRaw[0] : bRaw;
                const location = parseLocation(building?.location);
                // Handle architects
                const architects = building?.building_architects
                    ?.map((ba) => ba.architects?.name)
                    .filter(Boolean)
                    .join('; ');
                // Find category label if needed
                const category = collection.custom_categories?.find(c => c.id === item.custom_category_id)?.label || '';
                // Escape CSV fields
                const escape = (val) => {
                    if (val === null || val === undefined)
                        return '';
                    const str = String(val);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                };
                return [
                    escape(building?.name),
                    escape(building?.address),
                    escape(building?.city),
                    escape(building?.country),
                    escape(building?.year_completed),
                    escape(location?.lat),
                    escape(location?.lng),
                    escape(architects),
                    escape(item.note),
                    escape(category)
                ].join(',');
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${collection.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-export.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Export successful");
        }
        catch (_error) {
            toast.error("Failed to export data");
        }
        finally {
            setDownloading(false);
        }
    };
    return (_jsxs(Sheet, { open: open, onOpenChange: onOpenChange, children: [_jsxs(SheetContent, { side: "right", className: "w-full sm:max-w-[500px] flex flex-col h-full", children: [_jsxs(SheetHeader, { children: [_jsx(SheetTitle, { children: "Collection Settings" }), _jsx(SheetDescription, { children: "Manage your collection preferences and collaborators." })] }), _jsxs(Tabs, { defaultValue: "map", className: "w-full flex-1 flex flex-col min-h-0", children: [_jsxs(TabsList, { className: canEdit ? "grid w-full grid-cols-4" : "grid w-full grid-cols-1", children: [_jsx(TabsTrigger, { value: "map", children: "Map View" }), canEdit && _jsx(TabsTrigger, { value: "general", children: "General" }), canEdit && _jsx(TabsTrigger, { value: "markers", children: "Markers" }), canEdit && _jsx(TabsTrigger, { value: "collaborators", children: "Collaborators" })] }), _jsxs(TabsContent, { value: "map", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [canEdit && (_jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "community-images", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Show Community Images" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Display images in map and list" })] }), _jsx(Switch, { id: "community-images", checked: formData.show_community_images, onCheckedChange: (c) => setFormData({ ...formData, show_community_images: c }) })] })), onShowSavedCandidatesChange && (_jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "show-saved-candidates", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Show Saved Places" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Show your saved places as suggestions on the map" })] }), _jsx(Switch, { id: "show-saved-candidates", checked: showSavedCandidates, onCheckedChange: onShowSavedCandidatesChange })] }))] }), _jsxs(TabsContent, { value: "general", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "description", children: "Description" }), _jsx(Textarea, { id: "description", value: formData.description, onChange: (e) => setFormData({ ...formData, description: e.target.value }), rows: 3 })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "external-link", children: "External Link" }), _jsx(Input, { id: "external-link", value: formData.external_link, onChange: (e) => setFormData({ ...formData, external_link: e.target.value }), placeholder: "https://example.com" })] }), _jsxs("div", { className: "flex items-center justify-between space-x-2", children: [_jsxs(Label, { htmlFor: "public-mode", className: "flex flex-col space-y-1", children: [_jsx("span", { children: "Public Collection" }), _jsx("span", { className: "font-normal text-xs text-text-secondary", children: "Visible to everyone" })] }), _jsx(Switch, { id: "public-mode", checked: formData.is_public, onCheckedChange: (c) => setFormData({ ...formData, is_public: c }) })] }), _jsx(Separator, { className: "my-6" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-sm font-medium flex items-center gap-2", children: [_jsx(FolderPlus, { className: "h-4 w-4" }), " Folders"] }), _jsx("p", { className: "text-sm text-text-secondary", children: "Add this collection to one or more of your folders." }), collectionFolders.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: collectionFolders.map(folder => (_jsxs(Badge, { variant: "secondary", children: [_jsx(Folder, { className: "h-3 w-3 mr-1" }), folder.name] }, folder.id))) })), _jsx(Button, { onClick: () => setShowAddToFolder(true), className: "w-full sm:w-auto", variant: "outline", children: "Manage Folders" })] }), _jsx(Separator, { className: "my-6" }), onPlanRoute && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-sm font-medium flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-4 w-4" }), " Plan Route"] }), _jsx("p", { className: "text-sm text-text-secondary", children: "Generate an optimized route for visiting buildings in this collection." }), _jsx(Button, { onClick: () => { onPlanRoute(); onOpenChange(false); }, className: "w-full sm:w-auto", children: "Open Itinerary Planner" })] }), _jsx(Separator, { className: "my-6" })] })), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-medium", children: "Export Data" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Download a CSV file containing all buildings in this collection, including coordinates and notes." }), _jsxs(Button, { onClick: handleExportData, disabled: downloading, variant: "outline", className: "w-full sm:w-auto", children: [downloading ? _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : _jsx(Download, { className: "mr-2 h-4 w-4" }), "Download CSV"] })] }), _jsx(Separator, { className: "my-6" }), isOwner && (_jsxs("div", { className: "border border-feedback-destructive/50 rounded-md p-4 bg-feedback-destructive/5 space-y-4", children: [_jsxs("h3", { className: "text-feedback-destructive font-medium flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " Danger Zone"] }), _jsx("p", { className: "text-sm text-text-secondary", children: "Deleting this collection will permanently remove it and all its associations. This action cannot be undone." }), _jsx(Button, { variant: "destructive", onClick: () => setShowDeleteAlert(true), className: "w-full sm:w-auto", children: "Delete Collection" })] }))] }), _jsx(TabsContent, { value: "markers", className: "space-y-4 py-4 overflow-y-auto flex-1", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Label, { children: "Categorization Method" }), _jsxs(RadioGroup, { value: formData.categorization_method, onValueChange: (val) => setFormData({
                                                ...formData,
                                                categorization_method: val,
                                            }), className: "space-y-2", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "uniform", id: "cat-uniform" }), _jsx(Label, { htmlFor: "cat-uniform", className: "font-normal cursor-pointer", children: "Uniform" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "default", id: "cat-default" }), _jsx(Label, { htmlFor: "cat-default", className: "font-normal cursor-pointer", children: "Personal Status" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "status", id: "cat-status" }), _jsx(Label, { htmlFor: "cat-status", className: "font-normal cursor-pointer", children: "Member Status" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "rating_member", id: "cat-rating" }), _jsx(Label, { htmlFor: "cat-rating", className: "font-normal cursor-pointer", children: "Member Ratings" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "custom", id: "cat-custom" }), _jsx(Label, { htmlFor: "cat-custom", className: "font-normal cursor-pointer", children: "Custom Categories" })] })] }), _jsx("div", { className: "text-sm text-text-secondary bg-surface-muted/10 p-2 rounded-md border mt-2", children: METHOD_DESCRIPTIONS[formData.categorization_method] }), (formData.categorization_method === 'status' || formData.categorization_method === 'rating_member') && (_jsxs("div", { className: "pl-6 space-y-3 border-l-2 ml-1 mt-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { className: "text-xs font-semibold", children: "Member Filter" }), _jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [_jsx(Checkbox, { id: "specific-members", checked: formData.categorization_selected_members !== null, onCheckedChange: (checked) => {
                                                                        if (checked) {
                                                                            setFormData({ ...formData, categorization_selected_members: [] });
                                                                        }
                                                                        else {
                                                                            setFormData({ ...formData, categorization_selected_members: null });
                                                                        }
                                                                    } }), _jsx(Label, { htmlFor: "specific-members", className: "text-sm font-normal cursor-pointer", children: "Apply to specific members only" })] })] }), formData.categorization_selected_members !== null && (_jsx(ScrollArea, { className: "h-[150px] border rounded-md p-2 bg-surface-muted/5", children: contributors.length > 0 ? (_jsx("div", { className: "space-y-2", children: contributors.map(c => {
                                                            if (!c.user)
                                                                return null;
                                                            return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: `member-${c.user.id}`, checked: formData.categorization_selected_members?.includes(c.user.id), onCheckedChange: () => toggleMemberSelection(c.user.id) }), _jsx(Label, { htmlFor: `member-${c.user.id}`, className: "font-normal cursor-pointer text-sm", children: c.user.username })] }, c.user.id));
                                                        }) })) : (_jsx("div", { className: "text-xs text-text-secondary py-4 text-center", children: "No collaborators found." })) }))] })), formData.categorization_method === 'custom' && (_jsxs("div", { className: "space-y-4 pt-2", children: [_jsx(Separator, {}), _jsxs("div", { className: "flex gap-2 items-end", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Label, { className: "text-xs", children: "Category Name" }), _jsx(Input, { value: newCategory.label, onChange: (e) => setNewCategory({ ...newCategory, label: e.target.value }), placeholder: "e.g. Must Visit", className: "h-9" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs", children: "Color" }), _jsx("div", { className: "flex items-center gap-2", children: _jsx(Input, { type: "color", value: newCategory.color, onChange: (e) => setNewCategory({ ...newCategory, color: e.target.value }), className: "h-9 w-12 p-1 cursor-pointer" }) })] }), _jsx(Button, { size: "sm", onClick: addCustomCategory, disabled: !newCategory.label, children: _jsx(Plus, { className: "h-4 w-4" }) })] }), _jsx(ScrollArea, { className: "h-[200px] border rounded-md bg-surface-muted/10 p-2", children: formData.custom_categories && formData.custom_categories.length > 0 ? (_jsx("div", { className: "space-y-2", children: formData.custom_categories.map((cat) => (_jsxs("div", { className: "flex items-center justify-between bg-surface-card p-2 rounded-md shadow-sm border", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-4 h-4 rounded-full border shadow-sm", style: { backgroundColor: cat.color } }), _jsx("span", { className: "text-sm font-medium", children: cat.label })] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 text-text-secondary hover:text-feedback-destructive", onClick: () => removeCustomCategory(cat.id), children: _jsx(X, { className: "h-3 w-3" }) })] }, cat.id))) })) : (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary text-xs gap-2 opacity-50", children: [_jsx(MapPin, { className: "h-6 w-6" }), _jsx("p", { children: "No custom categories yet" })] })) })] }))] }) }), _jsxs(TabsContent, { value: "collaborators", className: "space-y-4 py-4 overflow-y-auto flex-1", children: [isOwner && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Add Collaborator" }), _jsx(UserSearch, { onSelect: (id) => handleAddContributor(id), excludeIds: contributors.map(c => c.user?.id).filter(Boolean) })] })), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Current Collaborators" }), loadingContributors ? (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) })) : contributors.length === 0 ? (_jsx("div", { className: "text-center py-8 text-text-secondary text-sm border rounded-md border-dashed", children: "No collaborators yet." })) : (_jsx(ScrollArea, { className: "h-[200px] border rounded-md", children: _jsx("div", { className: "divide-y", children: contributors.map(contributor => {
                                                        if (!contributor.user)
                                                            return null;
                                                        const isMe = currentUserId === contributor.user.id;
                                                        return (_jsxs("div", { className: "flex items-center justify-between p-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Avatar, { className: "h-8 w-8", children: [_jsx(AvatarImage, { src: contributor.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: contributor.user.username?.charAt(0) })] }), _jsxs("span", { className: "text-sm font-medium", children: [contributor.user.username, isMe && _jsx("span", { className: "ml-2 text-xs text-text-secondary", children: "(You)" })] })] }), isOwner && !isMe && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive", onClick: () => handleRemoveContributor(contributor.user.id), children: _jsx(Trash2, { className: "h-4 w-4" }) })), isMe && !isOwner && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive", onClick: handleLeaveCollection, title: "Leave Collection", children: _jsx(LogOut, { className: "h-4 w-4" }) }))] }, contributor.user.id));
                                                    }) }) }))] })] })] }), _jsx("div", { className: "mt-auto pt-4 border-t", children: _jsx(SheetFooter, { children: canEdit ? (_jsxs(Button, { onClick: handleSaveGeneral, disabled: saving, className: "w-full", children: [saving && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Save Changes"] })) : onSaveAll ? (_jsxs(Button, { onClick: () => { onSaveAll(); onOpenChange(false); }, className: "w-full", variant: "outline", children: [_jsx(Bookmark, { className: "w-4 h-4 mr-2" }), "Save All"] })) : null }) })] }), _jsx(AlertDialog, { open: showDeleteAlert, onOpenChange: setShowDeleteAlert, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Are you absolutely sure?" }), _jsx(AlertDialogDescription, { children: "This action cannot be undone. This will permanently delete your collection and remove all buildings associated with it." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleDeleteCollection, className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90", disabled: deleting, children: deleting ? "Deleting..." : "Delete Collection" })] })] }) }), showAddToFolder && currentUserId && (_jsx(AddToFolderDialog, { open: showAddToFolder, onOpenChange: setShowAddToFolder, collectionId: collection.id, userId: currentUserId, onSuccess: fetchCollectionFolders }))] }));
}
