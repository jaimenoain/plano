import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, X, Trash2, Loader2, ChevronLeft, ChevronRight, Check, Plus, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function ImageDetailsDialog({ imageId, initialUrl, type = 'image', isOpen, onClose, canInteract = true, uploadedBy, uploadDate, onNext, onPrev, hasNext, hasPrev, isGenerated, isOfficial, isHero, canEdit, onToggleOfficial, onSetHero }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const commentEndRef = useRef(null);
    const isValidUuid = imageId && UUID_REGEX.test(imageId);
    const isInteractive = canInteract && isValidUuid;
    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen)
            return undefined;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' && onNext && hasNext) {
                e.preventDefault();
                onNext();
            }
            else if (e.key === 'ArrowLeft' && onPrev && hasPrev) {
                e.preventDefault();
                onPrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onNext, onPrev, hasNext, hasPrev]);
    // Reset state when dialog opens with a new image
    useEffect(() => {
        if (isOpen && isInteractive) {
            fetchImageDetails();
        }
        else {
            // Reset for non-interactive images
            setComments([]);
            setLikesCount(0);
            setIsLiked(false);
        }
    }, [isOpen, imageId, isInteractive]);
    const fetchImageDetails = async () => {
        if (!imageId)
            return;
        setIsLoading(true);
        try {
            // 1. Fetch Comments
            const { data: commentsData, error: commentsError } = await supabase
                .from("image_comments")
                .select(`
          id, content, created_at,
          user:profiles(id, username, avatar_url)
        `)
                .eq("image_id", imageId)
                .order("created_at", { ascending: true });
            if (commentsError)
                throw commentsError;
            // Transform data to match Comment interface
            const formattedComments = commentsData.map((c) => ({
                id: c.id,
                content: c.content,
                created_at: c.created_at,
                user: c.user
            }));
            setComments(formattedComments);
            // 2. Fetch Likes Count & User Like Status
            const { data: imageData, error: imageError } = await supabase
                .from("review_images")
                .select("likes_count")
                .eq("id", imageId)
                .single();
            if (imageError)
                throw imageError;
            setLikesCount(imageData.likes_count || 0);
            if (user) {
                const { data: likeData } = await supabase
                    .from("image_likes")
                    .select("id")
                    .eq("image_id", imageId)
                    .eq("user_id", user.id)
                    .maybeSingle();
                setIsLiked(!!likeData);
            }
        }
        catch (_error) {
        }
        finally {
            setIsLoading(false);
            // Scroll to bottom of comments
            setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };
    const handleLike = async () => {
        if (!user || !imageId || !isInteractive)
            return;
        // Optimistic update
        const previousIsLiked = isLiked;
        const previousLikesCount = likesCount;
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        try {
            if (previousIsLiked) {
                // Unlike
                const { error } = await supabase
                    .from("image_likes")
                    .delete()
                    .eq("image_id", imageId)
                    .eq("user_id", user.id);
                if (error)
                    throw error;
            }
            else {
                // Like
                const { error } = await supabase
                    .from("image_likes")
                    .insert({
                    image_id: imageId,
                    user_id: user.id
                });
                if (error)
                    throw error;
            }
        }
        catch (_error) {
            // Revert optimistic update
            setIsLiked(previousIsLiked);
            setLikesCount(previousLikesCount);
            toast({ variant: "destructive", title: "Failed to update like" });
        }
    };
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!user || !imageId || !newComment.trim() || !isInteractive)
            return;
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from("image_comments")
                .insert({
                image_id: imageId,
                user_id: user.id,
                content: newComment.trim()
            })
                .select(`
          id, content, created_at,
          user:profiles(id, username, avatar_url)
        `)
                .single();
            if (error)
                throw error;
            // Add new comment to list
            const newCommentObj = {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                user: data.user
            };
            setComments([...comments, newCommentObj]);
            setNewComment("");
            // Scroll to bottom
            setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to post comment" });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDeleteComment = async (commentId) => {
        try {
            const { error } = await supabase
                .from("image_comments")
                .delete()
                .eq("id", commentId);
            if (error)
                throw error;
            setComments(comments.filter(c => c.id !== commentId));
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to delete comment" });
        }
    };
    if (!isOpen)
        return null;
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { hideCloseButton: true, className: "max-w-5xl h-[95vh] md:h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-surface-overlay border border-border-default rounded-lg shadow-lg", children: [_jsx(DialogTitle, { className: "sr-only", children: "Image Details" }), _jsx(DialogDescription, { className: "sr-only", children: "View full size image and comments" }), _jsx(DialogClose, { className: "absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none md:hidden", children: _jsx(X, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex-1 bg-black flex items-center justify-center relative min-h-[40vh] group/image", children: [hasPrev && (_jsx(Button, { variant: "ghost", size: "icon", className: "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10 opacity-0 group-hover/image:opacity-100 transition-opacity", onClick: (e) => {
                                e.stopPropagation();
                                onPrev?.();
                            }, children: _jsx(ChevronLeft, { className: "h-8 w-8" }) })), _jsx("div", { className: "absolute inset-0 flex items-center justify-center p-0 md:p-4", children: type === 'video' ? (_jsx(VideoPlayer, { src: initialUrl || "", className: "w-full h-full max-h-full", autoPlayOnVisible: true, muted: false })) : (_jsxs("div", { className: "relative inline-flex max-h-full max-w-full items-center justify-center", children: [_jsx("img", { src: initialUrl || "", alt: "Expanded view", className: "max-h-full max-w-full object-contain" }), isGenerated && (_jsx("div", { className: "absolute top-4 left-4 z-20 pointer-events-none", children: _jsx("span", { className: "bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-wider", children: "Render / CGI" }) }))] })) }), isGenerated && type === 'video' && (_jsx("div", { className: "absolute top-4 left-4 z-20 pointer-events-none", children: _jsx("span", { className: "bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded backdrop-blur-sm border border-white/10 uppercase tracking-wider", children: "Render / CGI" }) })), hasNext && (_jsx(Button, { variant: "ghost", size: "icon", className: "absolute right-2 md:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10 opacity-0 group-hover/image:opacity-100 transition-opacity", onClick: (e) => {
                                e.stopPropagation();
                                onNext?.();
                            }, children: _jsx(ChevronRight, { className: "h-8 w-8" }) }))] }), isInteractive && (_jsxs("div", { className: "w-full md:w-[400px] flex flex-col bg-surface-default border-l border-border-default h-[35vh] md:h-full", children: [_jsxs("div", { className: "p-4 border-b flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Avatar, { className: "w-8 h-8", children: [_jsx(AvatarImage, { src: uploadedBy?.avatar_url || undefined }), _jsx(AvatarFallback, { children: uploadedBy?.username?.[0]?.toUpperCase() })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-semibold", children: uploadedBy?.username || "Unknown" }), uploadDate && _jsx("span", { className: "text-xs text-text-secondary", children: format(new Date(uploadDate), 'MMMM d, yyyy') })] })] }), _jsx(DialogClose, { className: "hidden md:flex rounded-full hover:bg-surface-muted p-2", children: _jsx(X, { className: "h-5 w-5" }) })] }), canEdit && (_jsxs("div", { className: "px-4 py-3 border-b bg-surface-muted/10 space-y-2", children: [_jsx("h4", { className: "text-xs font-bold uppercase tracking-wider text-text-secondary", children: "Curation" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs(Button, { variant: isOfficial ? "secondary" : "outline", size: "sm", onClick: onToggleOfficial, className: "justify-start h-8", children: [isOfficial ? _jsx(Check, { className: "w-4 h-4 mr-2" }) : _jsx(Plus, { className: "w-4 h-4 mr-2" }), isOfficial ? "Official Lookbook" : "Add to Lookbook"] }), _jsxs(Button, { variant: isHero ? "secondary" : "outline", size: "sm", onClick: onSetHero, className: "justify-start h-8", disabled: isHero, children: [isHero ? _jsx(Check, { className: "w-4 h-4 mr-2" }) : _jsx(ImageIcon, { className: "w-4 h-4 mr-2" }), isHero ? "Current Hero Image" : "Set as Hero Image"] })] })] })), _jsxs("div", { className: "px-4 py-2 border-b flex items-center justify-start gap-4 shrink-0 bg-surface-muted/20", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: `flex items-center gap-1.5 px-2 ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-text-secondary'}`, onClick: handleLike, children: [_jsx(Heart, { className: `w-5 h-5 ${isLiked ? 'fill-current' : ''}` }), _jsx("span", { className: "font-semibold", children: likesCount })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-text-secondary", children: [_jsx(MessageCircle, { className: "w-5 h-5" }), _jsx("span", { className: "font-semibold", children: comments.length })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [isLoading ? (_jsx("div", { className: "flex justify-center p-8", children: _jsx(Loader2, { className: "w-6 h-6 animate-spin text-text-secondary" }) })) : comments.length === 0 ? (_jsx("div", { className: "text-center text-text-secondary py-8 text-sm", children: "No comments yet. Be the first to say something!" })) : (comments.map((comment) => (_jsxs("div", { className: "flex gap-3 group", children: [_jsxs(Avatar, { className: "w-8 h-8 shrink-0", children: [_jsx(AvatarImage, { src: comment.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: comment.user.username?.[0]?.toUpperCase() })] }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("span", { className: "text-sm font-semibold", children: comment.user.username }), _jsx("span", { className: "text-xs text-text-secondary", children: formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) })] }), _jsx("p", { className: "text-sm text-text-primary/90 break-words", children: comment.content })] }), user && user.id === comment.user.id && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1", onClick: () => handleDeleteComment(comment.id), children: _jsx(Trash2, { className: "w-3 h-3 text-feedback-destructive" }) }))] }, comment.id)))), _jsx("div", { ref: commentEndRef })] }), _jsx("div", { className: "p-4 border-t mt-auto bg-surface-default shrink-0", children: _jsxs("form", { onSubmit: handleAddComment, className: "flex gap-2", children: [_jsx(Input, { placeholder: "Add a comment...", value: newComment, onChange: (e) => setNewComment(e.target.value), className: "flex-1", disabled: isSubmitting }), _jsx(Button, { type: "submit", size: "icon", disabled: !newComment.trim() || isSubmitting, children: isSubmitting ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Send, { className: "w-4 h-4" }) })] }) })] }))] }) }));
}
