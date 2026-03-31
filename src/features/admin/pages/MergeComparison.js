import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getBuildingUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeftRight, Check, Trash2, ArrowLeft, AlertTriangle, Image as ImageIcon, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { getBuildingImageUrl } from "@/utils/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArchitectSelect } from "@/components/ui/architect-select";
import { BuildingMap } from "@/features/admin/components/BuildingMap";
import { parseLocation } from "@/utils/location";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, } from "@/components/ui/carousel";
function toComparisonBuilding(b) {
    const architects = b.architects
        ?.map((row) => row?.architect)
        .filter((a) => Boolean(a)) ?? [];
    return { ...b, architects };
}
export default function MergeComparison() {
    const { targetId, sourceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    // We store the raw buildings and then decide which is target/source based on state
    const [buildings, setBuildings] = useState([]);
    // Pointers to IDs
    const [targetPointer, setTargetPointer] = useState(targetId || null);
    const [sourcePointer, setSourcePointer] = useState(sourceId || null);
    // Review Images
    const [reviewImages, setReviewImages] = useState({});
    // Impact Stats
    const [impact, setImpact] = useState({ reviews: 0, photos: 0 });
    const [impactLoading, setImpactLoading] = useState(false);
    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    useEffect(() => {
        if (targetId && sourceId) {
            fetchBuildings(targetId, sourceId);
        }
    }, [targetId, sourceId]);
    // Re-fetch impact when source changes
    useEffect(() => {
        if (sourcePointer) {
            fetchImpact(sourcePointer);
        }
    }, [sourcePointer]);
    const fetchBuildings = async (id1, id2) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('buildings')
                .select('*, architects:building_architects(architect:architects(name, id, type))')
                .in('id', [id1, id2]);
            if (error)
                throw error;
            const transformed = data.map(toComparisonBuilding);
            if (transformed.length !== 2) {
                toast.error("Could not find both buildings");
                // navigate('/admin/merge'); // Optional: redirect back
                return;
            }
            setBuildings(transformed);
            // Fetch review images
            const { data: images } = await supabase
                .from('review_images')
                .select('building_id, storage_path')
                .in('building_id', [id1, id2]);
            if (images) {
                const imgMap = {};
                images.forEach((img) => {
                    if (img.storage_path) {
                        if (!imgMap[img.building_id])
                            imgMap[img.building_id] = [];
                        const fullUrl = getBuildingImageUrl(img.storage_path);
                        if (fullUrl)
                            imgMap[img.building_id].push(fullUrl);
                    }
                });
                setReviewImages(imgMap);
            }
        }
        catch (_error) {
            toast.error("Failed to load buildings");
        }
        finally {
            setLoading(false);
        }
    };
    const fetchImpact = async (sourceId) => {
        setImpactLoading(true);
        try {
            const [reviews, photos] = await Promise.all([
                supabase.from('user_buildings').select('*', { count: 'exact', head: true }).eq('building_id', sourceId),
                supabase.from('review_images').select('*', { count: 'exact', head: true }).eq('building_id', sourceId)
            ]);
            setImpact({
                reviews: reviews.count || 0,
                photos: photos.count || 0
            });
        }
        catch (_e) {
        }
        finally {
            setImpactLoading(false);
        }
    };
    const handleSwap = () => {
        setIsEditing(false); // Reset edit mode
        const temp = targetPointer;
        setTargetPointer(sourcePointer);
        setSourcePointer(temp);
    };
    const handleEditStart = () => {
        const target = buildings.find(b => b.id === targetPointer);
        if (target) {
            // Deep copy to avoid mutating state directly
            setEditForm(JSON.parse(JSON.stringify(target)));
            setIsEditing(true);
        }
    };
    const handleEditSave = async () => {
        if (!editForm || !targetPointer)
            return;
        try {
            // 1. Update scalar fields
            const { error: buildError } = await supabase
                .from('buildings')
                .update({
                name: editForm.name,
                city: editForm.city,
                address: editForm.address,
                year_completed: editForm.year_completed
            })
                .eq('id', targetPointer);
            if (buildError)
                throw buildError;
            // 2. Update Architects
            // First delete existing
            const { error: delError } = await supabase
                .from('building_architects')
                .delete()
                .eq('building_id', targetPointer);
            if (delError)
                throw delError;
            // Then insert new
            if (editForm.architects && editForm.architects.length > 0) {
                const { error: insError } = await supabase
                    .from('building_architects')
                    .insert(editForm.architects.map(a => ({
                    building_id: targetPointer,
                    architect_id: a.id
                })));
                if (insError)
                    throw insError;
            }
            // 3. Update local state
            setBuildings(prev => prev.map(b => b.id === targetPointer ? editForm : b));
            setIsEditing(false);
            toast.success("Target building updated successfully");
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast.error("Failed to update building: " + msg);
        }
    };
    const handleMerge = async () => {
        if (!targetPointer || !sourcePointer || !user)
            return;
        setMerging(true);
        try {
            const { error } = await supabase.rpc('merge_buildings', {
                target_id: targetPointer,
                source_id: sourcePointer
            });
            if (error)
                throw error;
            // Ensure soft delete is marked (redundant safety)
            await supabase.from('buildings').update({ is_deleted: true }).eq('id', sourcePointer);
            // Audit Log
            try {
                await supabase.from('admin_audit_logs').insert({
                    admin_id: user.id,
                    action_type: 'merge_buildings',
                    target_type: 'buildings',
                    target_id: targetPointer,
                    details: {
                        merged_source_id: sourcePointer,
                        source_name: buildings.find(b => b.id === sourcePointer)?.name
                    }
                });
            }
            catch (_auditError) {
                void _auditError;
            }
            toast.success("Buildings merged successfully. Redirecting...");
            // Redirect to survivor
            const target = buildings.find(b => b.id === targetPointer);
            navigate(getBuildingUrl(targetPointer, target?.slug, target?.short_id != null ? Number(target.short_id) : null));
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast.error("Merge failed: " + msg);
        }
        finally {
            setMerging(false);
        }
    };
    if (loading) {
        return _jsx("div", { className: "flex items-center justify-center h-screen", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin" }) });
    }
    const targetBuilding = buildings.find(b => b.id === targetPointer);
    const sourceBuilding = buildings.find(b => b.id === sourcePointer);
    const targetLocation = targetBuilding?.location ? parseLocation(targetBuilding.location) : null;
    const sourceLocation = sourceBuilding?.location ? parseLocation(sourceBuilding.location) : null;
    if (!targetBuilding || !sourceBuilding) {
        return (_jsxs("div", { className: "container mx-auto py-8 px-4 max-w-7xl flex flex-col items-center justify-center min-h-[50vh] space-y-4", children: [_jsx(AlertTriangle, { className: "h-16 w-16 text-text-secondary opacity-20" }), _jsx("h2", { className: "text-xl font-semibold text-text-secondary", children: "Buildings not found" }), _jsx(Button, { onClick: () => navigate('/admin/merge'), children: "Return to Merge Tool" })] }));
    }
    return (_jsxs("div", { className: "container mx-auto py-8 px-4 max-w-7xl", children: [_jsxs("div", { className: "mb-6 flex items-center gap-4", children: [_jsxs(Button, { variant: "ghost", onClick: () => navigate('/admin/merge'), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), " Back"] }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "Compare & Merge" }), _jsx("p", { className: "text-text-secondary", children: "Review details and confirm merge direction." })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 items-start", children: [_jsxs(Card, { className: "border-2 border-green-200 bg-green-50/30 overflow-hidden shadow-sm", children: [_jsxs("div", { className: "bg-green-100/80 p-3 text-green-800 font-bold flex justify-between items-center border-b border-green-200", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Check, { className: "h-5 w-5" }), " TARGET (KEEP)"] }), _jsxs("div", { className: "flex items-center gap-2", children: [!isEditing ? (_jsxs(Button, { size: "sm", variant: "ghost", onClick: handleEditStart, className: "h-7 px-2 text-green-800 hover:text-green-900 hover:bg-green-200/50", children: [_jsx(Pencil, { className: "h-3.5 w-3.5 mr-1" }), " Edit"] })) : (_jsxs("div", { className: "flex gap-1", children: [_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setIsEditing(false), className: "h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100/50", children: [_jsx(X, { className: "h-3.5 w-3.5 mr-1" }), " Cancel"] }), _jsxs(Button, { size: "sm", variant: "default", onClick: handleEditSave, className: "h-7 px-2 bg-green-600 hover:bg-green-700", children: [_jsx(Save, { className: "h-3.5 w-3.5 mr-1" }), " Save"] })] })), _jsx(Badge, { className: "bg-green-600 hover:bg-green-700 hidden sm:inline-flex", children: "Surviving" })] })] }), _jsx("div", { className: "aspect-video w-full bg-surface-muted relative overflow-hidden group", children: targetBuilding.hero_image_url ? (_jsx("img", { src: getBuildingImageUrl(targetBuilding.hero_image_url), alt: targetBuilding.name, className: "w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" })) : (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary/50 bg-surface-muted/50", children: [_jsx(ImageIcon, { className: "h-12 w-12 mb-2" }), _jsx("span", { className: "text-sm font-medium", children: "No Image" })] })) }), _jsxs(CardContent, { className: "p-6 space-y-4", children: [isEditing && editForm ? (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-text-secondary font-semibold uppercase", children: "Name" }), _jsx(Input, { value: editForm.name, onChange: e => setEditForm({ ...editForm, name: e.target.value }), className: "bg-white" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-text-secondary font-semibold uppercase", children: "Architect" }), _jsx(ArchitectSelect, { selectedArchitects: editForm.architects, setSelectedArchitects: (a) => setEditForm({ ...editForm, architects: a }), placeholder: "Select architects...", className: "bg-white" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-text-secondary font-semibold uppercase", children: "Year" }), _jsx(Input, { type: "number", value: editForm.year_completed || '', onChange: e => setEditForm({ ...editForm, year_completed: e.target.value ? parseInt(e.target.value) : null }), className: "bg-white" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-text-secondary font-semibold uppercase", children: "City" }), _jsx(Input, { value: editForm.city || '', onChange: e => setEditForm({ ...editForm, city: e.target.value }), className: "bg-white" })] })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-xs text-text-secondary font-semibold uppercase", children: "Address" }), _jsx(Textarea, { value: editForm.address || '', onChange: e => setEditForm({ ...editForm, address: e.target.value }), className: "bg-white min-h-[60px]" })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-4 border-t border-green-100", children: [_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setIsEditing(false), className: "text-red-600 hover:text-red-700 hover:bg-red-100/50", children: [_jsx(X, { className: "h-4 w-4 mr-1" }), " Cancel"] }), _jsxs(Button, { size: "sm", variant: "default", onClick: handleEditSave, className: "bg-green-600 hover:bg-green-700", children: [_jsx(Save, { className: "h-4 w-4 mr-1" }), " Save"] })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Name" }), _jsx("div", { className: "text-xl font-bold truncate", title: targetBuilding.name, children: targetBuilding.name })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Architect" }), _jsx("div", { className: "text-lg truncate", children: targetBuilding.architects?.map(a => a.name).join(", ") || "Unknown Architect" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Year" }), _jsx("div", { children: targetBuilding.year_completed || "N/A" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "City" }), _jsx("div", { className: "truncate", title: targetBuilding.city || "", children: targetBuilding.city || "N/A" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Address" }), _jsx("div", { className: "text-sm break-words line-clamp-2", title: targetBuilding.address || "", children: targetBuilding.address || "N/A" })] })] })), targetLocation && (_jsxs("div", { className: "space-y-1 pt-2", children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Location" }), _jsx("div", { className: "w-full h-48 rounded-md border border-border-default bg-surface-muted overflow-hidden relative", children: _jsx(BuildingMap, { lat: targetLocation.lat, lng: targetLocation.lng, className: "w-full h-full", locationPrecision: "exact" }) })] })), reviewImages[targetBuilding.id]?.length > 0 && (_jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Review Images" }), _jsxs(Carousel, { className: "w-full max-w-full relative group/carousel", children: [_jsx(CarouselContent, { className: "-ml-2", children: reviewImages[targetBuilding.id].map((url, idx) => (_jsx(CarouselItem, { className: "pl-2 basis-1/3 md:basis-1/4", children: _jsx("div", { className: "aspect-square relative overflow-hidden rounded-md border bg-surface-muted", children: _jsx("img", { src: url, alt: `Review ${idx}`, className: "object-cover w-full h-full" }) }) }, idx))) }), _jsx(CarouselPrevious, { className: "left-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" }), _jsx(CarouselNext, { className: "right-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" })] })] })), _jsx("div", { className: "pt-4 border-t border-green-200", children: _jsx("div", { className: "text-xs font-mono text-green-700/70 truncate", title: targetBuilding.id, children: targetBuilding.id }) })] })] }), _jsxs("div", { className: "flex flex-col items-center justify-center h-full py-12 lg:py-0 sticky top-20", children: [_jsx(Button, { size: "icon", variant: "outline", className: "rounded-full h-12 w-12 border-2 border-purple-200 bg-white hover:bg-purple-50 shadow-none transition-transform hover:scale-110 active:scale-95", onClick: handleSwap, title: "Swap Direction", children: _jsx(ArrowLeftRight, { className: "h-6 w-6 text-purple-600" }) }), _jsx("div", { className: "mt-2 text-xs font-medium text-text-secondary uppercase tracking-widest", children: "Swap" })] }), _jsxs(Card, { className: "border-2 border-red-200 bg-red-50/30 overflow-hidden shadow-sm", children: [_jsxs("div", { className: "bg-red-100/80 p-3 text-red-800 font-bold flex justify-between items-center border-b border-red-200", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Trash2, { className: "h-5 w-5" }), " SOURCE (REMOVE)"] }), _jsx(Badge, { variant: "destructive", children: "Will be Deleted" })] }), _jsxs("div", { className: "aspect-video w-full bg-surface-muted relative overflow-hidden group", children: [sourceBuilding.hero_image_url ? (_jsx("img", { src: getBuildingImageUrl(sourceBuilding.hero_image_url), alt: sourceBuilding.name, className: "w-full h-full object-cover grayscale opacity-90 transition-transform group-hover:scale-105 duration-500" })) : (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-text-secondary/50 bg-surface-muted/50", children: [_jsx(ImageIcon, { className: "h-12 w-12 mb-2" }), _jsx("span", { className: "text-sm font-medium", children: "No Image" })] })), _jsx("div", { className: "absolute inset-0 bg-red-500/10 mix-blend-multiply" })] }), _jsxs(CardContent, { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Name" }), _jsx("div", { className: "text-xl font-bold text-red-900/80 line-through decoration-red-500/50 truncate", title: sourceBuilding.name, children: sourceBuilding.name })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Architect" }), _jsx("div", { className: "text-lg text-red-900/80 truncate", children: sourceBuilding.architects?.map(a => a.name).join(", ") || "Unknown Architect" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Year" }), _jsx("div", { className: "text-red-900/80", children: sourceBuilding.year_completed || "N/A" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "City" }), _jsx("div", { className: "text-red-900/80 truncate", title: sourceBuilding.city || "", children: sourceBuilding.city || "N/A" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Address" }), _jsx("div", { className: "text-sm text-red-900/80 break-words line-clamp-2", title: sourceBuilding.address || "", children: sourceBuilding.address || "N/A" })] }), sourceLocation && (_jsxs("div", { className: "space-y-1 pt-2", children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Location" }), _jsx("div", { className: "w-full h-48 rounded-md border border-red-200 bg-surface-muted overflow-hidden relative", children: _jsx(BuildingMap, { lat: sourceLocation.lat, lng: sourceLocation.lng, className: "w-full h-full", locationPrecision: "exact" }) })] })), reviewImages[sourceBuilding.id]?.length > 0 && (_jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("div", { className: "text-sm text-text-secondary uppercase tracking-wider font-semibold", children: "Review Images" }), _jsxs(Carousel, { className: "w-full max-w-full relative group/carousel", children: [_jsx(CarouselContent, { className: "-ml-2", children: reviewImages[sourceBuilding.id].map((url, idx) => (_jsx(CarouselItem, { className: "pl-2 basis-1/3 md:basis-1/4", children: _jsx("div", { className: "aspect-square relative overflow-hidden rounded-md border bg-surface-muted", children: _jsx("img", { src: url, alt: `Review ${idx}`, className: "object-cover w-full h-full" }) }) }, idx))) }), _jsx(CarouselPrevious, { className: "left-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" }), _jsx(CarouselNext, { className: "right-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" })] })] })), _jsx("div", { className: "pt-4 border-t border-red-200", children: _jsx("div", { className: "text-xs font-mono text-red-700/70 truncate", title: sourceBuilding.id, children: sourceBuilding.id }) })] })] })] }), _jsx("div", { className: "mt-8", children: _jsx(Card, { className: "border-t-4 border-t-purple-500 shadow-none", children: _jsx(CardContent, { className: "p-8", children: _jsxs("div", { className: "flex flex-col md:flex-row items-center justify-between gap-8", children: [_jsxs("div", { className: "space-y-2 flex-1", children: [_jsxs("h3", { className: "text-xl font-bold flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-amber-500" }), "Merge Impact Summary"] }), _jsxs("p", { className: "text-text-secondary text-lg", children: ["You are about to merge ", _jsx("strong", { children: sourceBuilding.name }), " into ", _jsx("strong", { children: targetBuilding.name }), "."] }), _jsxs("div", { className: "flex items-center gap-4 mt-2", children: [_jsxs(Badge, { variant: "secondary", className: "text-sm px-3 py-1", children: ["Moving ", impactLoading ? "..." : impact.photos, " Photos"] }), _jsxs(Badge, { variant: "secondary", className: "text-sm px-3 py-1", children: ["Moving ", impactLoading ? "..." : impact.reviews, " Reviews/Visits"] })] })] }), _jsx("div", { children: _jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsx(Button, { size: "lg", variant: "destructive", className: "px-8 h-14 text-lg shadow-lg hover:shadow-xl transition-all", disabled: merging || impactLoading || isEditing, children: merging ? _jsx(Loader2, { className: "animate-spin mr-2" }) : isEditing ? "Save Edits First" : "Confirm and Unify" }) }), _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Irreversible Action" }), _jsxs(AlertDialogDescription, { children: ["Are you sure you want to merge these buildings?", _jsx("br", {}), _jsx("br", {}), _jsx("strong", { children: sourceBuilding.name }), " will be marked as deleted.", _jsx("br", {}), "All its content will belong to ", _jsx("strong", { children: targetBuilding.name }), "."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsxs(AlertDialogAction, { onClick: handleMerge, className: "bg-red-600 hover:bg-red-700", children: [merging ? _jsx(Loader2, { className: "animate-spin mr-2" }) : null, "Yes, Merge Buildings"] })] })] })] }) })] }) }) }) })] }));
}
