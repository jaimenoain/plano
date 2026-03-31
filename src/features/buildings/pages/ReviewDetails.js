import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Loader2, Trash2, Heart, Circle, MessageCircle, Pencil, MapPin, Send, ExternalLink, Calendar, Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MetaHead } from "@/components/common/MetaHead";
import NotFound from "@/pages/NotFound";
import { getBuildingImageUrl } from "@/utils/image";
import { ImageDetailsDialog } from "../components/ImageDetailsDialog";
export default function ReviewDetails() {
    const { id: paramId } = useParams(); // This is the Log UUID
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [review, setReview] = useState(null);
    const [comments, setComments] = useState([]);
    const [relatedReviews, setRelatedReviews] = useState([]);
    const [links, setLinks] = useState([]);
    const [likers, setLikers] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showLikesDialog, setShowLikesDialog] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [selectedImageId, setSelectedImageId] = useState(null);
    useEffect(() => {
        async function loadData() {
            if (!paramId) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setLoading(true);
            setNotFound(false);
            try {
                // 1. Fetch Log Data
                const { data: reviewData, error } = await supabase
                    .from("user_buildings")
                    .select(`
                    id, content, rating, tags, created_at, user_id, building_id, status,
                    user:profiles(username, avatar_url),
                    building:buildings(id, name, year_completed, address, main_image_url, architects:building_architects(architect:architects(name, id))),
                    images:review_images(id, storage_path, is_generated)
                `)
                    .eq("id", paramId)
                    .single();
                if (error) {
                    if (error.code === "PGRST116") {
                        setNotFound(true);
                        setLoading(false);
                        return;
                    }
                    throw error;
                }
                if (!reviewData) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }
                // 2. Fetch Auxiliary Data in Parallel
                const [likesCount, commentsCount, userLike, likersData] = await Promise.all([
                    supabase.from("likes").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                    supabase.from("comments").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                    user ? supabase.from("likes").select("id").eq("interaction_id", reviewData.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
                    supabase.from("likes").select("user_id, user:profiles(username, avatar_url)").eq("interaction_id", reviewData.id).order("created_at", { ascending: false }).limit(50)
                ]);
                const rawBuilding = Array.isArray(reviewData.building) ? reviewData.building[0] : reviewData.building;
                const formattedBuilding = {
                    ...rawBuilding,
                    architects: rawBuilding.architects?.map((a) => a.architect) || []
                };
                const images = [];
                for (const img of reviewData.images || []) {
                    const row = img;
                    const url = getBuildingImageUrl(row.storage_path);
                    if (url) {
                        images.push({ id: row.id, url, is_generated: row.is_generated });
                    }
                }
                setReview({
                    id: reviewData.id,
                    content: reviewData.content,
                    rating: reviewData.rating,
                    tags: reviewData.tags,
                    created_at: reviewData.created_at,
                    user_id: reviewData.user_id,
                    building_id: reviewData.building_id,
                    status: reviewData.status,
                    user: Array.isArray(reviewData.user) ? reviewData.user[0] : reviewData.user,
                    building: formattedBuilding,
                    images,
                    likes_count: likesCount.count || 0,
                    comments_count: commentsCount.count || 0,
                    is_liked: !!userLike.data,
                });
                if (likersData.data) {
                    setLikers(likersData.data.map(item => ({
                        user_id: item.user_id,
                        user: Array.isArray(item.user) ? item.user[0] : item.user
                    })));
                }
                // Related Reviews Logic (Same Building)
                if (reviewData.building_id) {
                    let followingIds = [];
                    if (user) {
                        const { data: follows } = await supabase
                            .from("follows")
                            .select("following_id")
                            .eq("follower_id", user.id);
                        followingIds = follows?.map(f => f.following_id) || [];
                    }
                    let relatedData = [];
                    // Try to find friends first
                    if (followingIds.length > 0) {
                        const { data: friendsData } = await supabase
                            .from("user_buildings")
                            .select(`
                            id, rating,
                            user:profiles(username, avatar_url)
                        `)
                            .eq("building_id", reviewData.building_id)
                            .in("user_id", followingIds)
                            .neq("id", reviewData.id)
                            .eq("status", "visited") // Only visited logs usually have ratings/value
                            .limit(15);
                        if (friendsData && friendsData.length > 0) {
                            relatedData = friendsData;
                        }
                    }
                    // Fallback to community
                    if (relatedData.length === 0) {
                        let query = supabase
                            .from("user_buildings")
                            .select(`
                            id, rating,
                            user:profiles(username, avatar_url)
                        `)
                            .eq("building_id", reviewData.building_id)
                            .neq("id", reviewData.id)
                            .eq("status", "visited")
                            .limit(15);
                        if (user) {
                            query = query.neq("user_id", user.id);
                        }
                        const { data: communityData } = await query;
                        if (communityData) {
                            relatedData = communityData;
                        }
                    }
                    if (relatedData.length > 0) {
                        const mapped = relatedData.map(r => ({
                            ...r,
                            user: Array.isArray(r.user) ? r.user[0] : r.user
                        }));
                        mapped.sort((a, b) => {
                            const aHasAvatar = !!a.user?.avatar_url;
                            const bHasAvatar = !!b.user?.avatar_url;
                            if (aHasAvatar === bHasAvatar)
                                return 0;
                            return bHasAvatar ? 1 : -1;
                        });
                        setRelatedReviews(mapped);
                    }
                }
                // Comments
                const { data: commentsData, error: commentsError } = await supabase
                    .from("comments")
                    .select(`
                    id, content, created_at, user_id,
                    user:profiles(username, avatar_url)
                `)
                    .eq("interaction_id", reviewData.id)
                    .order("created_at", { ascending: true });
                if (commentsError)
                    throw commentsError;
                let formattedComments = [];
                if (commentsData.length > 0) {
                    const commentIds = commentsData.map(c => c.id);
                    const { data: likesData } = await supabase
                        .from("comment_likes")
                        .select("comment_id, user_id")
                        .in("comment_id", commentIds);
                    formattedComments = commentsData.map(c => {
                        const relevantLikes = likesData?.filter((l) => l.comment_id === c.id) || [];
                        return {
                            ...c,
                            user: Array.isArray(c.user) ? c.user[0] : c.user,
                            likes_count: relevantLikes.length,
                            is_liked: user ? relevantLikes.some((l) => l.user_id === user.id) : false
                        };
                    });
                }
                setComments(formattedComments);
                // Links
                const { data: linksData } = await supabase
                    .from("review_links")
                    .select("id, url, title")
                    .eq("review_id", reviewData.id);
                let formattedLinks = [];
                if (linksData && linksData.length > 0) {
                    const linkIds = linksData.map(l => l.id);
                    const { data: allLinkLikes } = await supabase
                        .from("link_likes")
                        .select("link_id, user_id")
                        .in("link_id", linkIds);
                    formattedLinks = linksData.map(l => {
                        const relevant = allLinkLikes?.filter((x) => x.link_id === l.id) || [];
                        return {
                            ...l,
                            likes_count: relevant.length,
                            is_liked: user ? relevant.some((x) => x.user_id === user.id) : false
                        };
                    });
                }
                setLinks(formattedLinks);
            }
            catch (_e) {
                setNotFound(true);
            }
            finally {
                setLoading(false);
            }
        }
        loadData();
    }, [paramId, user?.id]);
    const handleLikeReview = async () => {
        if (!user || !review)
            return;
        // Optimistic update
        const isLiking = !review.is_liked;
        setReview(prev => prev ? ({
            ...prev,
            is_liked: isLiking,
            likes_count: isLiking ? prev.likes_count + 1 : prev.likes_count - 1
        }) : null);
        // Update likers list locally
        if (isLiking) {
            setLikers(prev => [
                {
                    user_id: user.id,
                    user: {
                        username: user.email?.split('@')[0] || "Me", // Fallback if profile not fully loaded
                        avatar_url: null
                    }
                },
                ...prev
            ]);
        }
        else {
            setLikers(prev => prev.filter(l => l.user_id !== user.id));
        }
        try {
            if (!isLiking) {
                await supabase.from("likes").delete().eq("interaction_id", review.id).eq("user_id", user.id);
            }
            else {
                await supabase.from("likes").insert({ interaction_id: review.id, user_id: user.id });
            }
            // Re-fetch to ensure data consistency, especially user details
            const { data } = await supabase.from("likes").select("user_id, user:profiles(username, avatar_url)").eq("interaction_id", review.id).order("created_at", { ascending: false }).limit(50);
            if (data) {
                setLikers(data.map(item => ({ user_id: item.user_id, user: Array.isArray(item.user) ? item.user[0] : item.user })));
            }
        }
        catch (_error) {
            // Revert on error would go here
        }
    };
    const handleLikeLink = async (linkId) => {
        if (!user)
            return;
        const link = links.find(l => l.id === linkId);
        if (!link)
            return;
        const wasLiked = link.is_liked;
        setLinks(prev => prev.map(l => l.id === linkId ? {
            ...l,
            is_liked: !wasLiked,
            likes_count: wasLiked ? l.likes_count - 1 : l.likes_count + 1
        } : l));
        try {
            if (wasLiked) {
                const { error } = await supabase.from("link_likes").delete().eq("link_id", linkId).eq("user_id", user.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from("link_likes").insert({ link_id: linkId, user_id: user.id });
                if (error)
                    throw error;
            }
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update like." });
            // Revert optimistic update
            setLinks(prev => prev.map(l => l.id === linkId ? {
                ...l,
                is_liked: wasLiked,
                likes_count: wasLiked ? l.likes_count + 1 : l.likes_count - 1
            } : l));
        }
    };
    const handleLikeComment = async (commentId) => {
        if (!user)
            return;
        const comment = comments.find(c => c.id === commentId);
        if (!comment)
            return;
        const wasLiked = comment.is_liked;
        setComments(prev => prev.map(c => c.id === commentId ? {
            ...c,
            is_liked: !wasLiked,
            likes_count: wasLiked ? c.likes_count - 1 : c.likes_count + 1
        } : c));
        try {
            if (wasLiked) {
                await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
            }
            else {
                await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
            }
        }
        catch (_error) {
        }
    };
    const handlePostComment = async () => {
        if (!user || !newComment.trim() || !review)
            return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from("comments").insert({
                interaction_id: review.id,
                user_id: user.id,
                content: newComment.trim()
            });
            if (error)
                throw error;
            setNewComment("");
            // Refresh comments and counts
            const { data: commentsData } = await supabase
                .from("comments")
                .select(`
          id, content, created_at, user_id,
          user:profiles(username, avatar_url)
        `)
                .eq("interaction_id", review.id)
                .order("created_at", { ascending: true });
            if (commentsData) {
                // Refresh comments to ensure data consistency
                const commentIds = commentsData.map(c => c.id);
                const { data: likesData } = await supabase
                    .from("comment_likes")
                    .select("comment_id, user_id")
                    .in("comment_id", commentIds);
                const formattedComments = commentsData.map(c => {
                    const relevantLikes = likesData?.filter((l) => l.comment_id === c.id) || [];
                    return {
                        ...c,
                        user: Array.isArray(c.user) ? c.user[0] : c.user,
                        likes_count: relevantLikes.length,
                        is_liked: user ? relevantLikes.some((l) => l.user_id === user.id) : false
                    };
                });
                setComments(formattedComments);
                setReview(prev => prev ? ({ ...prev, comments_count: prev.comments_count + 1 }) : null);
            }
            toast({ title: "Comment posted" });
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not post comment." });
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDeleteComment = async (commentId) => {
        try {
            const { error } = await supabase.from("comments").delete().eq("id", commentId);
            if (error)
                throw error;
            setComments(prev => prev.filter(c => c.id !== commentId));
            setReview(prev => prev ? ({ ...prev, comments_count: prev.comments_count - 1 }) : null);
            toast({ title: "Comment deleted" });
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not delete comment." });
        }
    };
    const handleDeleteReview = async () => {
        if (!review)
            return;
        if (!window.confirm("Are you sure you want to delete this log? This action cannot be undone."))
            return;
        try {
            const { error } = await supabase.from("user_buildings").delete().eq("id", review.id);
            if (error)
                throw error;
            toast({ title: "Log deleted" });
            navigate("/profile");
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not delete log." });
        }
    };
    const isBucketList = review?.status === 'pending';
    const isReviewOwner = user?.id === review?.user_id;
    if (loading) {
        return (_jsx(AppLayout, { children: _jsx("div", { className: "flex justify-center items-center h-[50vh]", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) }) }));
    }
    if (notFound || !review || !review.building)
        return _jsx(NotFound, {});
    const formatDate = (date) => formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^about /, "");
    return (_jsxs(_Fragment, { children: [_jsx(MetaHead, { title: `${review.user.username} - ${review.building.name}`, description: review.content || `Check out ${review.user.username}'s visit to ${review.building.name}`, image: review.images.length > 0 ? review.images[0].url : undefined }), _jsxs(AppLayout, { title: "Visit Log", showBack: true, children: [_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-6", children: [_jsx("h1", { className: "text-4xl font-bold tracking-tight leading-tight text-text-primary mb-6", children: "Visit Log" }), _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "border-border-default/50 shadow-sm bg-surface-card/50 backdrop-blur-sm", children: [_jsx(CardHeader, { className: "p-4 pb-0", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Link, { to: `/profile/${review.user.username || review.user_id}`, children: _jsxs(Avatar, { className: "h-10 w-10 border border-border-default", children: [_jsx(AvatarImage, { src: review.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: review.user.username?.charAt(0).toUpperCase() })] }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: `/profile/${review.user.username || review.user_id}`, className: "font-semibold text-text-primary hover:underline", children: review.user.username }), isBucketList ? (_jsx(Badge, { variant: "outline", className: "text-xs font-normal text-text-secondary border-border-default", children: "Wants to visit" })) : (_jsx(Badge, { variant: "outline", className: "text-xs font-normal text-text-secondary border-border-default", children: "Visited" }))] }), _jsx("div", { className: "text-xs text-text-secondary flex items-center gap-1", children: formatDate(review.created_at) })] })] }), !isBucketList && review.rating && (_jsx("div", { className: "flex gap-0.5", children: Array.from({ length: 3 }).map((_, i) => (_jsx(Circle, { className: cn("h-4 w-4", i < review.rating
                                                                            ? "fill-[#595959] text-[#595959]"
                                                                            : "text-text-secondary/20") }, i))) }))] }) }), _jsxs(CardContent, { className: "p-4 space-y-4", children: [review.content && (_jsx("div", { className: "text-lg md:text-xl text-text-primary/90 leading-relaxed font-normal", children: _jsx("p", { className: "whitespace-pre-line", children: review.content }) })), review.images.length > 0 && (_jsx("div", { className: "space-y-6", children: review.images.map((img) => (_jsx("div", { className: "rounded-lg overflow-hidden cursor-pointer", onClick: () => setSelectedImageId(img.id), children: _jsx("img", { src: img.url, alt: "Review attachment", className: "w-full h-full block hover:opacity-95 transition-opacity" }) }, img.id))) })), review.tags && review.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: review.tags.map((tag) => (_jsx(Badge, { variant: "secondary", className: "font-normal text-xs", children: tag }, tag))) })), _jsxs("div", { className: "flex items-center gap-4 pt-2 border-t border-border-default/50", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: cn("gap-2 px-2 h-8 text-text-secondary hover:text-text-primary", review.is_liked && "text-red-500 hover:text-red-600 hover:bg-red-500/10"), onClick: handleLikeReview, children: [_jsx(Heart, { className: cn("h-4 w-4", review.is_liked && "fill-current") }), _jsx("span", { className: "text-xs", children: review.likes_count > 0 ? review.likes_count : "Like" })] }), _jsxs("div", { className: "flex items-center gap-2 text-text-secondary text-xs", children: [_jsx(MessageCircle, { className: "h-4 w-4" }), _jsxs("span", { children: [comments.length, " Comments"] })] }), _jsx("div", { className: "flex-1" }), isReviewOwner && (_jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "icon", variant: "ghost", className: "h-8 w-8 text-text-secondary hover:text-text-primary", onClick: () => navigate(`/post?id=${review.building_id}&title=${encodeURIComponent(review.building.name)}`), children: _jsx(Pencil, { className: "w-4 h-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive hover:bg-feedback-destructive/10", onClick: handleDeleteReview, children: _jsx(Trash2, { className: "w-4 h-4" }) })] }))] }), likers.length > 0 && (_jsx("div", { className: "pt-1", children: _jsxs("button", { onClick: () => setShowLikesDialog(true), className: "flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors group text-left", children: [_jsx("div", { className: "flex -space-x-1.5", children: likers.slice(0, 3).map((liker) => (_jsxs(Avatar, { className: "h-5 w-5 border border-surface-default ring-1 ring-surface-default", children: [_jsx(AvatarImage, { src: liker.user.avatar_url || undefined }), _jsx(AvatarFallback, { className: "text-[6px]", children: liker.user.username?.charAt(0) })] }, liker.user_id))) }), _jsxs("span", { children: ["Liked by", " ", _jsx("span", { className: "font-medium text-text-primary", children: likers[0].user.username }), likers.length > 1 && (_jsxs(_Fragment, { children: [" ", "and", " ", _jsxs("span", { className: "font-medium text-text-primary", children: [likers.length - 1, " other", likers.length > 2 ? "s" : ""] })] }))] })] }) }))] })] }), _jsxs("div", { className: "space-y-4 pl-0 md:pl-2", children: [_jsx("h3", { className: "text-sm font-semibold text-text-secondary uppercase tracking-wider", children: "Comments" }), comments.map((comment) => (_jsxs("div", { className: "flex gap-3 group", children: [_jsx(Link, { to: `/profile/${comment.user_id}`, children: _jsxs(Avatar, { className: "h-8 w-8", children: [_jsx(AvatarImage, { src: comment.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: comment.user.username?.charAt(0) })] }) }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsxs("div", { className: "bg-surface-card/50 border border-border-default/50 rounded-lg p-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx(Link, { to: `/profile/${comment.user_id}`, className: "text-sm font-semibold hover:underline", children: comment.user.username }), _jsxs("span", { className: "text-xs text-text-secondary", children: [formatDistanceToNow(new Date(comment.created_at)), " ago"] })] }), _jsx("p", { className: "text-sm", children: comment.content })] }), _jsxs("div", { className: "flex items-center gap-4 pl-1", children: [_jsxs("button", { onClick: () => handleLikeComment(comment.id), className: cn("text-xs flex items-center gap-1.5 transition-colors hover:text-text-primary", comment.is_liked ? "text-red-500" : "text-text-secondary"), children: [_jsx(Heart, { className: cn("h-3 w-3", comment.is_liked && "fill-current") }), comment.likes_count > 0 && comment.likes_count] }), (isReviewOwner || user?.id === comment.user_id) && (_jsx("button", { onClick: () => handleDeleteComment(comment.id), className: "text-xs text-text-secondary hover:text-feedback-destructive flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100", children: "Delete" }))] })] })] }, comment.id)))] }), _jsxs("div", { className: "flex gap-3 items-start pt-4 border-t border-border-default/50 sticky bottom-0 bg-surface-default/95 backdrop-blur-sm p-4 -mx-4 md:static md:bg-transparent md:p-0", children: [_jsxs(Avatar, { className: "h-8 w-8", children: [_jsx(AvatarImage, { src: user?.user_metadata?.avatar_url || undefined }), _jsx(AvatarFallback, { children: user?.email?.charAt(0) })] }), _jsxs("div", { className: "flex-1 flex gap-2", children: [_jsx(Textarea, { value: newComment, onChange: (e) => setNewComment(e.target.value), placeholder: "Write a comment...", className: "min-h-[40px] h-[40px] py-2 resize-none" }), _jsx(Button, { size: "icon", onClick: handlePostComment, disabled: submitting || !newComment.trim(), className: "h-10 w-10 shrink-0", children: submitting ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Send, { className: "h-4 w-4" })) })] })] })] }), _jsxs(Card, { className: "overflow-hidden border-border-default/50 shadow-sm", children: [_jsxs("div", { className: "aspect-[4/3] bg-surface-muted relative group cursor-pointer", onClick: () => navigate(`/building/${review.building_id}`), children: [review.building.main_image_url ? (_jsx("img", { src: getBuildingImageUrl(review.building.main_image_url), alt: review.building.name, className: "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-text-secondary bg-surface-muted/50", children: _jsx(Building2, { className: "h-10 w-10 opacity-20" }) })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" }), _jsx("div", { className: "absolute bottom-3 left-3 right-3 text-white", children: _jsx("h3", { className: "font-bold text-lg leading-tight shadow-sm", children: review.building.name }) })] }), _jsxs(CardContent, { className: "p-4 space-y-4", children: [_jsxs("div", { className: "space-y-2 text-sm", children: [review.building.address && (_jsxs("div", { className: "flex items-start gap-2 text-text-secondary", children: [_jsx(MapPin, { className: "h-4 w-4 shrink-0 mt-0.5" }), _jsx("span", { children: review.building.address })] })), review.building.year_completed && (_jsxs("div", { className: "flex items-center gap-2 text-text-secondary", children: [_jsx(Calendar, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: review.building.year_completed })] })), review.building.architects &&
                                                                review.building.architects.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 pt-1", children: review.building.architects.map((arch) => (_jsx(Badge, { variant: "secondary", className: "text-xs bg-surface-muted/50 hover:bg-surface-muted", children: arch.name }, arch.id))) }))] }), _jsx(Button, { className: "w-full", variant: "outline", onClick: () => navigate(`/building/${review.building_id}`), children: "View Building Details" })] })] }), relatedReviews.length > 0 && (_jsxs("div", { className: "bg-surface-card/30 rounded-lg p-4 border border-border-default/50", children: [_jsx("h4", { className: "text-xs font-semibold uppercase text-text-secondary mb-3 tracking-wider", children: "Also visited by" }), _jsx("div", { className: "flex flex-wrap gap-2", children: relatedReviews.map((r) => (_jsx(Link, { to: `/profile/${r.user.username}`, children: _jsxs(Avatar, { className: "h-8 w-8 ring-2 ring-surface-default hover:ring-brand-primary transition-all cursor-pointer", children: [_jsx(AvatarImage, { src: r.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: r.user.username?.charAt(0) })] }) }, r.id))) }), _jsxs("p", { className: "text-xs text-text-secondary mt-2", children: ["+ ", relatedReviews.length, " others from the community"] })] })), links.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("h4", { className: "text-xs font-semibold uppercase text-text-secondary tracking-wider", children: "Linked Resources" }), _jsx("div", { className: "grid gap-2", children: links.map((link) => {
                                                    let domain = "";
                                                    try {
                                                        domain = new URL(link.url).hostname;
                                                    }
                                                    catch { }
                                                    return (_jsxs("div", { className: "flex items-center justify-between p-2 rounded-md bg-surface-card border border-border-default/50 hover:border-border-default transition-colors group", children: [_jsxs("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("div", { className: "h-8 w-8 rounded bg-surface-muted/50 flex items-center justify-center shrink-0", children: _jsx(ExternalLink, { className: "h-4 w-4 text-text-secondary" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium truncate", children: link.title || domain }), _jsx("p", { className: "text-xs text-text-secondary truncate", children: domain })] })] }), _jsx(Button, { variant: "ghost", size: "icon", className: cn("h-8 w-8 text-text-secondary", link.is_liked && "text-red-500"), onClick: () => handleLikeLink(link.id), children: _jsx(Heart, { className: cn("h-4 w-4", link.is_liked && "fill-current") }) })] }, link.id));
                                                }) })] }))] })] }), _jsx(Dialog, { open: showLikesDialog, onOpenChange: setShowLikesDialog, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Liked by" }) }), _jsx(ScrollArea, { className: "max-h-[60vh]", children: _jsx("div", { className: "space-y-4 py-2", children: likers.map((liker) => (_jsxs(Link, { to: `/profile/${liker.user.username}`, onClick: () => setShowLikesDialog(false), className: "flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors", children: [_jsxs(Avatar, { className: "h-10 w-10", children: [_jsx(AvatarImage, { src: liker.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: liker.user.username?.charAt(0) })] }), _jsx("div", { className: "font-medium text-text-primary", children: liker.user.username })] }, liker.user_id))) }) })] }) }), _jsx(ImageDetailsDialog, { isOpen: !!selectedImageId, onClose: () => setSelectedImageId(null), imageId: selectedImageId, initialUrl: review.images.find((img) => img.id === selectedImageId)?.url || null, uploadedBy: {
                            username: review.user.username,
                            avatar_url: review.user.avatar_url,
                        }, uploadDate: review.created_at, isGenerated: review.images.find((img) => img.id === selectedImageId)?.is_generated, onNext: () => {
                            const currentIndex = review.images.findIndex((img) => img.id === selectedImageId);
                            if (currentIndex < review.images.length - 1) {
                                setSelectedImageId(review.images[currentIndex + 1].id);
                            }
                        }, onPrev: () => {
                            const currentIndex = review.images.findIndex((img) => img.id === selectedImageId);
                            if (currentIndex > 0) {
                                setSelectedImageId(review.images[currentIndex - 1].id);
                            }
                        }, hasNext: review.images.findIndex((img) => img.id === selectedImageId) <
                            review.images.length - 1, hasPrev: review.images.findIndex((img) => img.id === selectedImageId) > 0 })] })] }));
}
