import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildingForm } from "@/features/buildings/components/BuildingForm";
import { BuildingLocationPicker } from "@/features/buildings/components/BuildingLocationPicker";
import { Loader2, MapPin, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseLocation } from "@/utils/location";
import { cn } from "@/lib/utils";
export default function Buildings() {
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    // Edit State
    const [editingBuilding, setEditingBuilding] = useState(null);
    const [formValues, setFormValues] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const ITEMS_PER_PAGE = 20;
    useEffect(() => {
        fetchBuildings();
    }, [page, searchQuery, statusFilter]);
    const fetchBuildings = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("buildings")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false });
            if (searchQuery) {
                query = query.ilike("name", `%${searchQuery}%`);
            }
            if (statusFilter === "verified") {
                query = query.eq("is_verified", true);
            }
            else if (statusFilter === "deleted") {
                query = query.eq("is_deleted", true);
            }
            else if (statusFilter === "pending") {
                query = query.eq("is_verified", false).eq("is_deleted", false);
            }
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            const { data, count, error } = await query.range(from, to);
            if (error)
                throw error;
            setBuildings(data || []);
            if (count) {
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
            }
        }
        catch (_error) {
            toast.error("Failed to load buildings");
        }
        finally {
            setLoading(false);
        }
    };
    const handleVerify = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from("buildings")
                .update({ is_verified: !currentStatus })
                .eq("id", id);
            if (error)
                throw error;
            setBuildings(prev => prev.map(b => b.id === id ? { ...b, is_verified: !currentStatus } : b));
            toast.success(currentStatus ? "Building un-verified" : "Building verified");
        }
        catch (_error) {
            toast.error("Failed to update status");
        }
    };
    const handleSoftDelete = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from("buildings")
                .update({ is_deleted: !currentStatus })
                .eq("id", id);
            if (error)
                throw error;
            setBuildings(prev => prev.map(b => b.id === id ? { ...b, is_deleted: !currentStatus } : b));
            toast.success(currentStatus ? "Building restored" : "Building soft-deleted");
        }
        catch (_error) {
            toast.error("Failed to update status");
        }
    };
    const openEditDialog = async (building) => {
        // Parse location
        const coords = parseLocation(building.location);
        const lat = coords ? coords.lat : null;
        const lng = coords ? coords.lng : null;
        const precision = building.location_precision === 'approximate' ? 'approximate' : 'exact';
        setLocationData({
            lat,
            lng,
            address: building.address || "",
            city: building.city ?? null,
            country: building.country ?? null,
            precision
        });
        // Fetch Relations
        const { data: relations } = await supabase
            .from('building_architects')
            .select('architect:architects(id, name, type)')
            .eq('building_id', building.id);
        const relationArchitects = relations?.map((r) => r.architect) || [];
        const { data: typologies } = await supabase
            .from('building_functional_typologies')
            .select('typology_id')
            .eq('building_id', building.id);
        const typologyIds = typologies?.map((t) => t.typology_id) || [];
        const { data: attributes } = await supabase
            .from('building_attributes')
            .select('attribute_id')
            .eq('building_id', building.id);
        const attributeIds = attributes?.map((a) => a.attribute_id) || [];
        setFormValues({
            name: building.name,
            hero_image_url: building.hero_image_url,
            year_completed: building.year_completed ?? null,
            architects: relationArchitects,
            functional_category_id: building.functional_category_id || "",
            functional_typology_ids: typologyIds,
            selected_attribute_ids: attributeIds,
        });
        setEditingBuilding(building);
    };
    const handleSaveBuilding = async (formData) => {
        if (!editingBuilding || !locationData)
            return;
        if (locationData.lat === null || locationData.lng === null) {
            toast.error("Please set location on the map tab");
            return;
        }
        try {
            const { error } = await supabase
                .from('buildings')
                .update({
                name: formData.name,
                hero_image_url: formData.hero_image_url,
                year_completed: formData.year_completed,
                // Architects removed from here (handled via relation)
                functional_category_id: formData.functional_category_id,
                functional_typology_ids: formData.functional_typology_ids,
                selected_attribute_ids: formData.selected_attribute_ids,
                address: locationData.address,
                city: locationData.city,
                country: locationData.country,
                location: `POINT(${locationData.lng} ${locationData.lat})`,
                location_precision: locationData.precision,
            })
                .eq('id', editingBuilding.id);
            if (error)
                throw error;
            const id = editingBuilding.id;
            // Handle Architects Junction Table
            // 1. Clear existing links
            await supabase.from('building_architects').delete().eq('building_id', id);
            // 2. Insert new links
            if (formData.architects.length > 0) {
                const links = formData.architects.map(a => ({ building_id: id, architect_id: a.id }));
                const { error: _linkError } = await supabase.from('building_architects').insert(links);
            }
            // Handle Typologies Junction Table
            await supabase.from('building_functional_typologies').delete().eq('building_id', id);
            if (formData.functional_typology_ids.length > 0) {
                const tLinks = formData.functional_typology_ids.map(tid => ({ building_id: id, typology_id: tid }));
                const { error: _tError } = await supabase.from('building_functional_typologies').insert(tLinks);
            }
            // Handle Attributes Junction Table
            await supabase.from('building_attributes').delete().eq('building_id', id);
            if (formData.selected_attribute_ids.length > 0) {
                const aLinks = formData.selected_attribute_ids.map(aid => ({ building_id: id, attribute_id: aid }));
                const { error: _aError } = await supabase.from('building_attributes').insert(aLinks);
            }
            toast.success("Building updated");
            setEditingBuilding(null);
            setFormValues(null);
            fetchBuildings(); // Refresh list
        }
        catch (_error) {
            toast.error("Failed to update building");
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-surface-default space-y-6 p-4 sm:p-6 lg:p-8", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-text-primary", children: "Building Registry" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Search buildings...", className: "max-w-xs", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }), _jsxs(Select, { value: statusFilter, onValueChange: (val) => setStatusFilter(val), children: [_jsx(SelectTrigger, { className: "w-[180px]", children: _jsx(SelectValue, { placeholder: "Status" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Status" }), _jsx(SelectItem, { value: "verified", children: "Verified" }), _jsx(SelectItem, { value: "pending", children: "Pending" }), _jsx(SelectItem, { value: "deleted", children: "Deleted" })] })] })] })] }), _jsx("div", { className: "rounded-sm border border-border-default bg-surface-card", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Location" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsx(TableBody, { children: loading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "h-24 text-center", children: _jsxs("div", { className: "flex justify-center items-center", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin mr-2 text-text-secondary" }), "Loading..."] }) }) })) : buildings.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "h-24 text-center text-text-secondary", children: "No buildings found." }) })) : (buildings.map((building) => (_jsxs(TableRow, { className: cn("group", building.is_deleted ? "opacity-60 bg-surface-muted/50" : ""), children: [_jsxs(TableCell, { className: "font-medium", children: [building.name, building.year_completed && (_jsxs("span", { className: "text-text-secondary font-normal ml-2", children: ["(", building.year_completed, ")"] }))] }), _jsx(TableCell, { children: building.city && building.country ? `${building.city}, ${building.country}` : building.address || "Unknown" }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-2", children: [building.is_verified && _jsx(Badge, { variant: "success", children: "Verified" }), building.is_deleted && _jsx(Badge, { variant: "destructive", children: "Deleted" }), !building.is_verified && !building.is_deleted && _jsx(Badge, { variant: "secondary", children: "Pending" })] }) }), _jsx(TableCell, { className: "text-right", children: _jsx("div", { className: "flex justify-end gap-2", children: _jsxs("div", { className: "flex gap-2 items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150", children: [_jsx(Button, { size: "icon", variant: "ghost", title: "Locate on Map", onClick: () => openEditDialog(building), children: _jsx(MapPin, { className: "h-4 w-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", title: "Edit Details", onClick: () => openEditDialog(building), children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx("div", { className: "h-8 w-px bg-border-default mx-1" }), _jsx(Switch, { checked: building.is_verified, onCheckedChange: () => handleVerify(building.id, building.is_verified ?? false), className: "data-[state=checked]:bg-feedback-success", title: "Toggle Verification" }), _jsx(Button, { size: "icon", variant: building.is_deleted ? "ghost" : "destructive", className: building.is_deleted ? "text-feedback-success" : undefined, onClick: () => handleSoftDelete(building.id, building.is_deleted ?? false), title: building.is_deleted ? "Restore" : "Soft Delete", children: building.is_deleted ? _jsx(CheckCircle2, { className: "h-4 w-4" }) : _jsx(Trash2, { className: "h-4 w-4" }) })] }) }) })] }, building.id)))) })] }) }), _jsxs("div", { className: "flex justify-center gap-2", children: [_jsx(Button, { variant: "outline", disabled: page === 1, onClick: () => setPage(p => p - 1), children: "Previous" }), _jsx(Button, { variant: "outline", disabled: page >= totalPages, onClick: () => setPage(p => p + 1), children: "Next" })] }), _jsx(Dialog, { open: !!editingBuilding, onOpenChange: (open) => !open && setEditingBuilding(null), children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Edit Building: ", editingBuilding?.name] }) }), editingBuilding && locationData && formValues && (_jsxs(Tabs, { defaultValue: "details", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [_jsx(TabsTrigger, { value: "details", children: "Details" }), _jsx(TabsTrigger, { value: "location", children: "Location & Map" })] }), _jsx(TabsContent, { value: "details", className: "mt-4", children: _jsx(BuildingForm, { initialValues: formValues, onSubmit: handleSaveBuilding, isSubmitting: false, submitLabel: "Save Changes", buildingId: editingBuilding.id, shortId: editingBuilding.short_id != null && editingBuilding.short_id !== '' ? Number(editingBuilding.short_id) : null }) }), _jsxs(TabsContent, { value: "location", className: "mt-4", children: [_jsxs("div", { className: "mb-4 p-4 border border-feedback-warning/30 rounded-sm bg-feedback-warning/10 text-feedback-warning text-sm", children: ["Adjust the location below. When finished, go back to the ", _jsx("strong", { children: "Details" }), " tab to click \"Save Changes\"."] }), _jsx(BuildingLocationPicker, { initialLocation: {
                                                lat: locationData.lat,
                                                lng: locationData.lng,
                                                address: locationData.address,
                                                city: locationData.city,
                                                country: locationData.country
                                            }, initialPrecision: locationData.precision, onLocationChange: (newLoc) => setLocationData(newLoc) })] })] }))] }) })] }));
}
