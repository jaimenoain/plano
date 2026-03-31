import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon, Heart } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
export default function UserPhotoGallery() {
    const { user: currentUser } = useAuth();
    const { username: routeUsername } = useParams();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [profileUsername, setProfileUsername] = useState(null);
    const [sortOrder, setSortOrder] = useState('recent');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [targetUserId, setTargetUserId] = useState(null);
    const { containerRef, isVisible } = useIntersectionObserver();
    useEffect(() => {
        const resolveUser = async () => {
            setLoading(true);
            let resolvedUserId = null;
            let resolvedUsername = null;
            // 1. Resolve User
            if (routeUsername) {
                // Check if UUID or Username
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
                let query = supabase.from("profiles").select("id, username");
                if (isUuid) {
                    query = query.eq("id", routeUsername);
                }
                else {
                    query = query.ilike("username", routeUsername);
                }
                const { data } = await query.maybeSingle();
                if (data) {
                    resolvedUserId = data.id;
                    resolvedUsername = data.username;
                }
            }
            else if (currentUser) {
                resolvedUserId = currentUser.id;
                // Fetch username for display
                const { data } = await supabase.from("profiles").select("username").eq("id", resolvedUserId).single();
                resolvedUsername = data?.username || "Me";
            }
            setTargetUserId(resolvedUserId);
            setProfileUsername(resolvedUsername);
            // If no user found, we stop loading
            if (!resolvedUserId) {
                setLoading(false);
            }
            else {
                // Reset photos/page when user changes
                setPhotos([]);
                setPage(0);
                setHasMore(true);
            }
        };
        resolveUser();
    }, [routeUsername, currentUser]);
    useEffect(() => {
        const fetchPhotos = async () => {
            if (!targetUserId)
                return;
            if (page === 0)
                setLoading(true);
            else
                setFetchingMore(true);
            const from = page * 24;
            const to = from + 24 - 1;
            // 2. Fetch Photos
            const { data, error } = await supabase
                .from("review_images")
                .select(`
          id,
          storage_path,
          likes_count,
          review_id,
          user_buildings!review_images_review_id_fkey (
            building:buildings (
              id,
              name,
              slug
            )
          )
        `)
                .eq("user_id", targetUserId)
                .order(sortOrder === 'popular' ? "likes_count" : "created_at", { ascending: false })
                .range(from, to);
            if (!error && data) {
                if (data.length < 24) {
                    setHasMore(false);
                }
                const photoIds = data.map((p) => p.id);
                const likedIds = new Set();
                if (currentUser && photoIds.length > 0) {
                    const { data: likesData } = await supabase
                        .from("image_likes")
                        .select("image_id")
                        .eq("user_id", currentUser.id)
                        .in("image_id", photoIds);
                    if (likesData) {
                        likesData.forEach((l) => likedIds.add(l.image_id));
                    }
                }
                const rows = data;
                const mappedPhotos = rows.map((item) => {
                    const ub = item.user_buildings;
                    const row = Array.isArray(ub) ? ub[0] : ub;
                    const bRaw = row?.building;
                    const b = Array.isArray(bRaw) ? bRaw[0] : bRaw;
                    return {
                        id: item.id,
                        storage_path: item.storage_path,
                        likes_count: item.likes_count || 0,
                        is_liked: likedIds.has(item.id),
                        review_id: item.review_id,
                        building: b ?? null,
                    };
                });
                setPhotos(prev => page === 0 ? mappedPhotos : [...prev, ...mappedPhotos]);
            }
            setLoading(false);
            setFetchingMore(false);
        };
        fetchPhotos();
    }, [targetUserId, page, sortOrder, currentUser]);
    useEffect(() => {
        if (isVisible && hasMore && !loading && !fetchingMore) {
            setPage(prev => prev + 1);
        }
    }, [isVisible, hasMore, loading, fetchingMore]);
    const handleSortChange = (val) => {
        if (val === 'recent' || val === 'popular') {
            setSortOrder(val);
            setPage(0);
            setPhotos([]);
            setHasMore(true);
        }
    };
    const handleLike = async (e, photoId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser)
            return;
        const photo = photos.find(p => p.id === photoId);
        if (!photo)
            return;
        const wasLiked = photo.is_liked;
        // Optimistic Update
        setPhotos(prev => prev.map(p => {
            if (p.id === photoId) {
                return {
                    ...p,
                    is_liked: !p.is_liked,
                    likes_count: p.is_liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
                };
            }
            return p;
        }));
        try {
            if (wasLiked) {
                const { error } = await supabase
                    .from("image_likes")
                    .delete()
                    .eq("user_id", currentUser.id)
                    .eq("image_id", photoId);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase
                    .from("image_likes")
                    .insert({
                    user_id: currentUser.id,
                    image_id: photoId
                });
                if (error)
                    throw error;
            }
        }
        catch (_err) {
            // Revert
            setPhotos(prev => prev.map(p => {
                if (p.id === photoId) {
                    return {
                        ...p,
                        is_liked: wasLiked,
                        likes_count: photo.likes_count // Restore original count
                    };
                }
                return p;
            }));
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" }) }));
    }
    if (!profileUsername) {
        return (_jsx(AppLayout, { title: "Not Found", showBack: true, children: _jsx("div", { className: "flex flex-col items-center justify-center min-h-[50vh] text-text-secondary", children: _jsx("p", { children: "User not found." }) }) }));
    }
    return (_jsx(AppLayout, { title: `${profileUsername}'s Photos`, showBack: true, showLogo: false, children: _jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary mb-6", children: "Photos" }), photos.length > 0 && (_jsx("div", { className: "flex justify-end mb-4", children: _jsxs(Select, { value: sortOrder, onValueChange: handleSortChange, children: [_jsx(SelectTrigger, { className: "w-[180px]", children: _jsx(SelectValue, { placeholder: "Sort by" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "recent", children: "Recent" }), _jsx(SelectItem, { value: "popular", children: "Popular" })] })] }) })), photos.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center min-h-[40vh] text-text-secondary gap-2", children: [_jsx("div", { className: "bg-surface-muted/50 p-4 rounded-sm", children: _jsx(ImageIcon, { className: "h-8 w-8 opacity-50" }) }), _jsx("p", { children: "No photos uploaded yet." })] })) : (_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: [photos.map((photo) => {
                            const imageUrl = getBuildingImageUrl(photo.storage_path);
                            const linkUrl = photo.building ? `/building/${photo.building.id}/${photo.building.slug}` : "#";
                            return (_jsxs(Link, { to: linkUrl, className: "relative aspect-square overflow-hidden rounded-sm bg-surface-muted/20 group block", children: [_jsx("img", { src: imageUrl, alt: photo.building?.name || "User photo", className: "object-cover w-full h-full transition-transform duration-300 group-hover:scale-105", loading: "lazy" }), _jsx("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" }), _jsxs("button", { onClick: (e) => handleLike(e, photo.id), className: "absolute top-2 right-2 p-2 rounded-full bg-black/40 /* Photo overlay \u2014 bg-black/40 approved per COMPONENT_SPEC \u00A78 backdrop convention */ hover:bg-black/60 transition-colors backdrop-blur-sm group/btn z-10 flex items-center gap-1.5", children: [_jsx(Heart, { className: cn("w-4 h-4 transition-colors", photo.is_liked ? "fill-feedback-destructive text-feedback-destructive" : "text-text-inverse") }), photo.likes_count > 0 && (_jsx("span", { className: "text-xs font-medium text-text-inverse", children: photo.likes_count }))] }), photo.building && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 p-2 bg-black/50 /* Photo overlay \u2014 bg-black/50 approved per COMPONENT_SPEC \u00A78 backdrop convention */ opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none", children: _jsx("p", { className: "text-text-inverse text-xs truncate font-medium", children: photo.building.name }) }))] }, photo.id));
                        }), hasMore && (_jsx("div", { "data-testid": "sentinel", ref: containerRef, className: "col-span-full flex items-center justify-center p-4 min-h-[50px]", children: fetchingMore && (_jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" })) }))] }))] }) }));
}
