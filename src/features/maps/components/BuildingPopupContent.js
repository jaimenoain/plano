import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Bookmark, Check, EyeOff, Trash2, Plus, MapPin, Map, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { getBuildingImageUrl } from '@/utils/image';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserBuildingStatuses } from '@/features/profile/hooks/useUserBuildingStatuses';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
export function BuildingPopupContent({ cluster, onMouseEnter, onMouseLeave, onRemoveFromCollection, onAddCandidate }) {
    const { user } = useAuth();
    const { statuses, ratings } = useUserBuildingStatuses();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    // Interaction State
    const [justInteracted, setJustInteracted] = useState(null);
    const [optimisticRating, setOptimisticRating] = useState(null);
    const [hoverRating, setHoverRating] = useState(null);
    // Confirmation State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState("");
    const [confirmMessage, setConfirmMessage] = useState("");
    const [pendingDeletion, setPendingDeletion] = useState(null);
    // Convert cluster ID to string for status lookup
    const buildingId = String(cluster.id);
    const viewerStatus = statuses[buildingId];
    const isSaved = viewerStatus === 'pending';
    const isVisited = viewerStatus === 'visited';
    const isIgnored = viewerStatus === 'ignored';
    const performUpdate = async (status, successMessage, removeMessage) => {
        if (!user)
            return;
        setIsSaving(true);
        try {
            if (viewerStatus === status) {
                // Toggle off (delete)
                const { error } = await supabase
                    .from("user_buildings")
                    .delete()
                    .match({ user_id: user.id, building_id: buildingId });
                if (error)
                    throw error;
                toast({ title: removeMessage });
                setJustInteracted(null);
            }
            else {
                // Set new status
                const { error } = await supabase.from("user_buildings").upsert({
                    user_id: user.id,
                    building_id: buildingId,
                    status: status,
                    edited_at: new Date().toISOString()
                }, { onConflict: 'user_id, building_id' });
                if (error)
                    throw error;
                toast({ title: successMessage });
                setJustInteracted(status === 'pending' ? 'saved' : (status === 'visited' ? 'visited' : null));
            }
            queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
            queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
        }
        catch {
            toast({ variant: "destructive", title: "Failed to update status" });
        }
        finally {
            setIsSaving(false);
            setConfirmOpen(false); // Ensure dialog is closed
        }
    };
    const handleAction = async (status, successMessage, removeMessage) => {
        if (!user) {
            toast({ title: "Please log in first" });
            return;
        }
        // If we are REMOVING the status (toggling off)
        if (viewerStatus === status) {
            // Check for content (reviews, images)
            setIsSaving(true);
            try {
                const { data } = await supabase
                    .from('user_buildings')
                    .select('content, review_images(count)')
                    .eq('user_id', user.id)
                    .eq('building_id', buildingId)
                    .single();
                const hasReview = data?.content && data.content.trim().length > 0;
                const imageCount = data?.review_images?.[0]?.count || 0;
                if (hasReview || imageCount > 0) {
                    let msg = "You are about to remove this building from your list.";
                    if (hasReview && imageCount > 0) {
                        msg += ` This will permanently delete your review and ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
                    }
                    else if (hasReview) {
                        msg += " This will permanently delete your written review.";
                    }
                    else if (imageCount > 0) {
                        msg += ` This will permanently delete ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
                    }
                    setConfirmTitle("Delete building data?");
                    setConfirmMessage(msg);
                }
                else {
                    setConfirmTitle("Remove from list?");
                    setConfirmMessage("Are you sure you want to remove this building from your list?");
                }
                setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
                setConfirmOpen(true);
                setIsSaving(false); // Stop loading so dialog can show
                return;
            }
            catch {
                // Fallback to confirming anyway or just proceeding? Better to confirm safe.
                setConfirmTitle("Remove from list?");
                setConfirmMessage("Are you sure you want to remove this building?");
                setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
                setConfirmOpen(true);
                setIsSaving(false);
                return;
            }
        }
        // Otherwise, just do it (Upsert)
        performUpdate(status, successMessage, removeMessage);
    };
    const handleSave = (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleAction('pending', "Saved to your list", "Removed from your list");
    };
    const handleVisit = (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleAction('visited', "Marked as visited", "Removed from visited");
    };
    const handleHide = (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleAction('ignored', "Building hidden", "Building unhidden");
    };
    const handleRemove = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onRemoveFromCollection) {
            onRemoveFromCollection(buildingId);
        }
    };
    const handleAdd = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onAddCandidate) {
            onAddCandidate(buildingId);
        }
    };
    const handleRate = async (rating) => {
        if (!user)
            return;
        setOptimisticRating(rating);
        try {
            const { error } = await supabase
                .from("user_buildings")
                .update({ rating: rating })
                .eq("user_id", user.id)
                .eq("building_id", buildingId);
            if (error)
                throw error;
            queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
        }
        catch {
            toast({ variant: "destructive", title: "Failed to update rating" });
            setOptimisticRating(null); // Revert on error
        }
    };
    const buildingUrl = cluster.slug ? `/building/${cluster.slug}` : `/building/${cluster.id}`;
    // Custom Marker Logic
    if (cluster.is_custom_marker) {
        return (_jsxs("div", { className: "flex w-[200px] flex-col overflow-hidden rounded-md bg-surface-default shadow-lg relative", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, children: [_jsx("div", { className: "relative h-[120px] w-full bg-surface-muted flex items-center justify-center", children: cluster.image_url ? (_jsx(_Fragment, { children: _jsx("img", { src: getBuildingImageUrl(cluster.image_url), alt: cluster.name || 'Marker', className: "h-full w-full object-cover" }) })) : (_jsx(MapPin, { className: "h-10 w-10 text-text-secondary/50" })) }), _jsxs("div", { className: "flex flex-col gap-2 p-3", children: [cluster.name ? (_jsx("h3", { className: "text-sm font-semibold line-clamp-2", children: cluster.name })) : (_jsx("span", { className: "text-xs text-text-secondary", children: "Unlabeled Marker" })), cluster.notes && (_jsxs("p", { className: "text-xs text-text-secondary line-clamp-3 italic", children: ["\"", cluster.notes, "\""] })), _jsxs("div", { className: "flex flex-col gap-2 pt-2 border-t", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "flex-1 h-8 text-xs", onClick: (e) => {
                                                e.stopPropagation();
                                                const url = cluster.google_place_id
                                                    ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${cluster.google_place_id}`
                                                    : `https://www.google.com/maps/search/?api=1&query=${cluster.lat},${cluster.lng}`;
                                                window.open(url, '_blank');
                                            }, children: [_jsx(Map, { className: "h-3 w-3 mr-1" }), "Google Maps"] }), cluster.website && (_jsx(Button, { variant: "outline", size: "sm", className: "h-8 w-8 p-0 shrink-0", onClick: (e) => {
                                                e.stopPropagation();
                                                let url = cluster.website;
                                                if (!url.startsWith('http'))
                                                    url = `https://${url}`;
                                                window.open(url, '_blank');
                                            }, title: "Visit Website", children: _jsx(ExternalLink, { className: "h-3 w-3" }) }))] }), onRemoveFromCollection && (_jsx("div", { className: "flex justify-end", onTouchStart: (e) => e.stopPropagation(), children: _jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 text-feedback-destructive hover:text-feedback-destructive hover:bg-feedback-destructive/10 w-full", onClick: handleRemove, children: [_jsx(Trash2, { className: "h-4 w-4 mr-1" }), "Remove Marker"] }) }))] })] })] }));
    }
    // Candidate Logic (Simplified Actions)
    if (cluster.is_candidate) {
        return (_jsxs("div", { className: "flex w-[200px] flex-col overflow-hidden rounded-md bg-surface-default shadow-lg relative", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, children: [_jsx("a", { href: buildingUrl, target: "_blank", rel: "noopener noreferrer", className: "absolute inset-0 z-10", "aria-label": `View details for ${cluster.name || 'Building'}` }), _jsxs("div", { className: "relative h-[200px] w-full bg-surface-muted", children: [cluster.image_url ? (_jsx("img", { src: getBuildingImageUrl(cluster.image_url), alt: cluster.name || 'Building', className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-xs text-text-secondary", children: "No Image" })), _jsx("div", { className: "absolute top-2 right-2 z-20", children: _jsx("span", { className: "bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm", children: "SUGGESTED" }) })] }), _jsxs("div", { className: "flex flex-col gap-2 p-2", children: [cluster.name ? (_jsx("h3", { className: "text-sm font-semibold line-clamp-2", children: cluster.name })) : (_jsx("span", { className: "text-xs text-text-secondary", children: "Loading..." })), _jsx("div", { className: "flex items-center justify-center pt-2 relative z-20", onClick: (e) => e.stopPropagation(), onTouchStart: (e) => e.stopPropagation(), children: _jsxs(Button, { variant: "default", size: "sm", className: "w-full h-8", onClick: handleAdd, children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add to Map"] }) })] })] }));
    }
    // Standard Building Logic
    return (_jsxs("div", { className: "flex w-[200px] flex-col overflow-hidden rounded-md bg-surface-default shadow-lg relative", onMouseEnter: onMouseEnter, onMouseLeave: onMouseLeave, children: [_jsx("a", { href: buildingUrl, target: "_blank", rel: "noopener noreferrer", className: "absolute inset-0 z-10", "aria-label": `View details for ${cluster.name || 'Building'}` }), _jsx("div", { className: "relative h-[200px] w-full bg-surface-muted", children: cluster.image_url ? (_jsx("img", { src: getBuildingImageUrl(cluster.image_url), alt: cluster.name || 'Building', className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-xs text-text-secondary", children: "No Image" })) }), _jsxs("div", { className: "flex flex-col gap-2 p-2", children: [cluster.name ? (_jsx("h3", { className: "text-sm font-semibold line-clamp-2", children: cluster.name })) : (_jsx("span", { className: "text-xs text-text-secondary", children: "Loading details..." })), user && (_jsxs("div", { className: "flex items-center w-full border-t relative z-20", onClick: (e) => e.stopPropagation(), onTouchStart: (e) => e.stopPropagation(), children: [_jsx(Button, { variant: isVisited ? "default" : "ghost", className: `flex-1 h-12 rounded-none ${isVisited ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-text-secondary hover:bg-brand-primary/10'}`, onClick: handleVisit, title: "Mark as visited", disabled: isSaving, children: _jsx(Check, { className: `h-4 w-4 ${isVisited ? 'stroke-[3px]' : ''}` }) }), _jsx(Button, { variant: isSaved ? "default" : "ghost", className: `flex-1 h-12 rounded-none border-x ${isSaved ? '' : 'text-text-secondary hover:bg-brand-primary/10'}`, onClick: handleSave, title: "Save", disabled: isSaving, children: _jsx(Bookmark, { className: `h-4 w-4 ${isSaved ? 'fill-current' : ''}` }) }), _jsx(Button, { variant: isIgnored ? "destructive" : "ghost", className: `flex-1 h-12 rounded-none ${isIgnored ? '' : 'text-text-secondary hover:bg-feedback-destructive/10'}`, onClick: handleHide, title: "Hide", disabled: isSaving, children: _jsx(EyeOff, { className: "h-4 w-4" }) }), onRemoveFromCollection && (_jsx("div", { className: "border-l flex flex-1", children: _jsx(Button, { variant: "ghost", className: "flex-1 h-12 rounded-none text-feedback-destructive hover:text-feedback-destructive hover:bg-feedback-destructive/10", onClick: handleRemove, title: "Remove from map", children: _jsx(Trash2, { className: "h-4 w-4" }) }) }))] })), justInteracted && (_jsxs("div", { className: "flex justify-center items-center gap-3 pt-3 pb-1 border-t animate-in fade-in slide-in-from-top-1 duration-300 relative z-20", onClick: (e) => e.stopPropagation(), onTouchStart: (e) => e.stopPropagation(), children: [_jsx("div", { className: "h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm", children: justInteracted === 'saved' ? (_jsx(Bookmark, { className: "h-4 w-4 fill-current" })) : (_jsx(Check, { className: "h-5 w-5 stroke-[3px]" })) }), [1, 2, 3].map((rating) => {
                                const currentRating = optimisticRating !== null ? optimisticRating : (ratings[buildingId] || 0);
                                const activeRating = hoverRating !== null ? hoverRating : currentRating;
                                const isFilled = activeRating >= rating;
                                return (_jsx("div", { className: "p-1 -m-1 cursor-pointer", onClick: (e) => {
                                        e.stopPropagation();
                                        handleRate(rating);
                                    }, onMouseEnter: () => setHoverRating(rating), onMouseLeave: () => setHoverRating(null), children: _jsx("div", { className: `
                                  h-8 w-8 rounded-full transition-all duration-200
                                  flex items-center justify-center border
                                  ${isFilled
                                            ? "bg-black border-black"
                                            : "bg-transparent border-gray-300 hover:border-gray-400"}
                              ` }) }, rating));
                            })] }))] }), _jsx(AlertDialog, { open: confirmOpen, onOpenChange: setConfirmOpen, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: confirmTitle }), _jsx(AlertDialogDescription, { children: confirmMessage })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { onClick: () => setConfirmOpen(false), children: "Cancel" }), _jsx(AlertDialogAction, { onClick: () => pendingDeletion && pendingDeletion(), className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90", children: "Confirm Delete" })] })] }) })] }));
}
