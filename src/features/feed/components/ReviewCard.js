import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Heart, MessageCircle, Circle, Image as ImageIcon, Bookmark, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SuggestedContentBlock } from "./SuggestedContentBlock";
import { FollowButton } from "@/features/profile/components/FollowButton";
function getCityFromAddress(address) {
    if (!address)
        return "";
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        return parts[parts.length - 2];
    }
    return parts[0];
}
const RatingCircles = ({ rating }) => {
    return (_jsx("div", { className: "flex items-center gap-0.5", children: Array.from({ length: 3 }).map((_, i) => (_jsx(Circle, { className: `w-3 h-3 ${i < rating
                ? "fill-brand-primary text-text-primary"
                : "fill-transparent text-text-secondary/20"}` }, i))) }));
};
export function ReviewCard({ entry, onLike, onImageLike: _onImageLike, onComment, isDetailView = false, hideUser = false, hideBuildingInfo = false, imagePosition = 'left', variant = 'default', showCommunityImages = true }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [failedImages, setFailedImages] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    // FIXED: Safety Check - Prevent crash if building data is missing
    if (!entry.building)
        return null;
    const handleSave = async (e) => {
        e.stopPropagation();
        if (!user)
            return;
        if (!entry.building?.id)
            return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from("user_buildings").upsert({
                user_id: user.id,
                building_id: entry.building.id,
                status: 'pending',
                edited_at: new Date().toISOString()
            }, { onConflict: 'user_id, building_id' });
            if (error)
                throw error;
            toast({ title: "Saved to your list" });
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to save" });
        }
        finally {
            setIsSaving(false);
        }
    };
    const posterUrl = getBuildingImageUrl(entry.building.main_image_url);
    const handleCardClick = (e) => {
        if (isDetailView)
            return;
        const target = e.target;
        if (target.closest('button') || target.closest('.video-container'))
            return;
        if (entry.building.id) {
            navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
        }
        else {
            navigate(`/review/${entry.id}`);
        }
    };
    const handleCommentClick = (e) => {
        e.stopPropagation();
        if (onComment) {
            onComment(entry.id);
        }
        else {
            if (entry.building.id) {
                navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
            }
            else {
                navigate(`/review/${entry.id}`);
            }
        }
    };
    // Safe user access
    const username = entry.user?.username || "Unknown User";
    const avatarUrl = entry.user?.avatar_url || undefined;
    const isVerifiedArchitect = entry.user?.is_verified_architect || false;
    const isArchitectOfBuilding = entry.user?.is_architect_of_building || false;
    const userInitial = username.charAt(0).toUpperCase();
    // Title Logic
    const mainTitle = entry.building.name;
    // Metadata Logic: Architect • Year, fallback to Address
    const architects = entry.building.architects;
    const year_completed = entry.building.year_completed;
    // Helper to extract names from potentially mixed type
    const architectNames = architects
        ? architects.map((a) => (typeof a === "string" ? a : a.name)).filter(Boolean)
        : [];
    let subTitle = entry.building.address;
    if (variant === 'compact') {
        const parts = [];
        if (architectNames.length > 0) {
            parts.push(architectNames.slice(0, 2).join(", "));
        }
        if (year_completed) {
            parts.push(year_completed);
        }
        if (parts.length > 0) {
            subTitle = parts.join(" • ");
        }
        else {
            subTitle = entry.building.address;
        }
    }
    else {
        const architectsList = architectNames.slice(0, 2).join(", ");
        if (architectsList) {
            subTitle = architectsList;
            if (year_completed) {
                subTitle += ` • ${year_completed}`;
            }
        }
        else if (year_completed) {
            subTitle = `${year_completed}`;
            if (entry.building.address) {
                subTitle += ` • ${entry.building.address}`;
            }
        }
    }
    const mediaItems = [];
    // 1. Video (First priority)
    if (entry.video_url) {
        mediaItems.push({
            id: `video-${entry.id}`,
            type: 'video',
            url: entry.video_url,
            poster: (entry.images && entry.images.length > 0) ? entry.images[0].url : posterUrl || undefined
        });
    }
    // 2. Images
    if (entry.images && entry.images.length > 0) {
        entry.images.forEach(img => {
            mediaItems.push({
                id: img.id,
                type: 'image',
                url: img.url
            });
        });
    }
    const hasMedia = !hideBuildingInfo && (mediaItems.length > 0 || !!posterUrl);
    const isCompact = variant === 'compact';
    const flexDirection = imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse';
    // --- 1. DETAIL VIEW (List View) ---
    if (isDetailView) {
        return (_jsxs("article", { className: "px-4 py-4 hairline", children: [!hideUser ? (_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsxs(Avatar, { className: "h-9 w-9", children: [_jsx(AvatarImage, { src: avatarUrl }), _jsx(AvatarFallback, { className: "bg-surface-muted text-text-primary text-sm", children: userInitial })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-text-primary truncate", children: username }), _jsx("p", { className: "text-xs text-text-secondary", children: formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "") })] })] })) : (_jsx("div", { className: "mb-3", children: _jsx("p", { className: "text-xs text-text-secondary", children: formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "") }) })), _jsxs("div", { className: "flex gap-3", children: [!hideBuildingInfo && (mediaItems.length > 0 && mediaItems[0].type === 'video' ? (_jsx("div", { className: "w-32 h-24 bg-black rounded-sm flex-shrink-0 video-container", children: _jsx(VideoPlayer, { src: mediaItems[0].url, poster: mediaItems[0].poster, className: "w-full h-full", autoPlayOnVisible: false, muted: true, objectFit: "cover" }) })) : mediaItems.length > 0 ? (_jsx("img", { src: mediaItems[0].url, alt: entry.building.name, className: "w-32 h-24 object-cover rounded-sm flex-shrink-0" })) : posterUrl ? (_jsx("img", { src: posterUrl, alt: entry.building.name, className: "w-32 h-24 object-cover rounded-sm flex-shrink-0" })) : (_jsx("div", { className: "w-32 h-24 bg-surface-muted rounded-sm flex-shrink-0 flex items-center justify-center", children: _jsx("span", { className: "text-xs text-text-secondary", children: "No image" }) }))), _jsxs("div", { className: "flex-1 min-w-0", children: [!hideBuildingInfo && (_jsxs("div", { className: "mb-2", children: [_jsx("h3", { className: "text-base font-semibold text-text-primary truncate", children: mainTitle }), subTitle && (_jsx("p", { className: "text-xs text-text-secondary truncate", children: subTitle }))] })), entry.rating && entry.rating > 0 && (_jsx("div", { className: "flex items-center gap-1 mb-2", children: _jsx(RatingCircles, { rating: entry.rating }) })), entry.content && (_jsx("p", { className: "text-sm text-text-secondary mb-2 break-words", children: entry.content }))] })] }), _jsxs("div", { className: "flex items-center gap-6 mt-3 pt-2", children: [_jsxs("button", { onClick: (e) => {
                                e.stopPropagation();
                                onLike?.(entry.id);
                                window.dispatchEvent(new CustomEvent('pwa-interaction'));
                            }, className: "flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors", children: [_jsx(Heart, { className: `h-4 w-4 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}` }), _jsx("span", { className: "text-xs", children: entry.likes_count })] }), _jsxs("button", { onClick: handleCommentClick, className: "flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors", children: [_jsx(MessageCircle, { className: "h-4 w-4" }), _jsx("span", { className: "text-xs", children: entry.comments_count })] })] })] }));
    }
    // Define components for render
    const city = getCityFromAddress(entry.building.address);
    const action = entry.status === 'pending' ? 'saved' : 'visited';
    const Header = !hideUser && (_jsxs("div", { className: `p-3 md:p-4 flex items-center gap-3 border-b border-border-default/40`, children: [_jsxs(Avatar, { className: "h-10 w-10 border border-border-default/50 shrink-0", children: [_jsx(AvatarImage, { src: avatarUrl }), _jsx(AvatarFallback, { children: userInitial })] }), _jsx("div", { className: "text-sm md:text-base text-text-primary leading-snug min-w-0 max-w-full flex-1 break-words", children: _jsxs("div", { className: "flex flex-col gap-0.5 md:block min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 md:inline md:gap-0", children: [_jsx("span", { className: "font-semibold truncate md:text-clip min-w-0", children: username }), isVerifiedArchitect && (_jsx("div", { className: "inline-flex items-center text-text-primary ml-1 align-middle", title: "Verified Architect", children: _jsx(BadgeCheck, { className: "w-4 h-4" }) })), entry.is_suggested && entry.user_id && (_jsx("span", { className: "md:inline-block md:ml-2 min-w-0", children: _jsx(FollowButton, { userId: entry.user_id, hideIfFollowing: true, className: "h-5 text-[10px] px-2" }) }))] }), _jsxs("div", { className: "flex items-center gap-1 min-w-0 md:inline md:gap-0", children: [_jsxs("span", { className: "text-text-secondary/60 font-normal md:ml-1 shrink-0", children: [" ", action, " "] }), _jsx("span", { className: "font-semibold text-text-primary truncate block md:inline md:w-auto md:max-w-none min-w-0 flex-1 md:flex-none", children: mainTitle }), city && _jsxs("span", { className: "text-text-secondary hidden md:inline", children: [" in ", city] })] }), _jsxs("div", { className: "flex items-center gap-1 min-w-0 md:inline md:gap-0", children: [entry.rating && entry.rating > 0 && (_jsx("span", { className: "inline-flex items-center gap-0.5 align-middle md:ml-2 shrink-0", children: _jsx(RatingCircles, { rating: entry.rating }) })), _jsxs("span", { className: "text-text-secondary text-xs md:ml-2 shrink min-w-0 truncate", children: [!(entry.rating && entry.rating > 0) && _jsx("span", { className: "hidden md:inline", children: "\u2022 " }), formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", ""), " ago"] })] })] }) })] }));
    const renderMediaItem = (item, className, overlay) => (_jsxs("div", { className: `relative w-full h-full min-w-0 overflow-hidden ${className || ''}`, children: [_jsx("div", { className: "absolute inset-0 w-full h-full", children: item.type === 'video' ? (_jsx("div", { className: "w-full h-full video-container overflow-hidden", children: _jsx(VideoPlayer, { src: item.url, poster: item.poster, className: "w-full h-full transition-transform duration-500 hover:scale-105", autoPlayOnVisible: true, muted: true, objectFit: "cover" }) })) : (!failedImages.has(item.id) ? (_jsx("img", { src: item.url, alt: "Review photo", className: "w-full h-full object-cover transition-transform duration-500 hover:scale-105", onError: () => setFailedImages(prev => new Set(prev).add(item.id)) })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-text-secondary bg-surface-muted/50", children: _jsx(ImageIcon, { className: "w-4 h-4 opacity-50" }) }))) }), overlay && (_jsx("div", { className: "absolute inset-0 z-10", children: overlay }))] }, item.id));
    const renderMediaGrid = () => {
        if (mediaItems.length === 0)
            return null;
        if (mediaItems.length === 1) {
            return renderMediaItem(mediaItems[0]);
        }
        if (mediaItems.length === 2) {
            return (_jsx("div", { className: "w-full h-full grid grid-cols-2 gap-0.5", children: mediaItems.map(item => renderMediaItem(item)) }));
        }
        if (mediaItems.length === 3) {
            return (_jsxs("div", { className: "w-full h-full flex flex-col gap-0.5", children: [_jsx("div", { className: "flex-1 min-h-0", children: renderMediaItem(mediaItems[0]) }), _jsx("div", { className: "flex-1 min-h-0 grid grid-cols-2 gap-0.5", children: mediaItems.slice(1, 3).map(item => renderMediaItem(item)) })] }));
        }
        // 4+ Items
        return (_jsxs("div", { className: "w-full h-full flex flex-col gap-0.5 rounded-sm overflow-hidden", children: [_jsx("div", { className: "flex-[2] min-h-0", children: renderMediaItem(mediaItems[0]) }), _jsx("div", { className: "flex-1 min-h-0 grid grid-cols-3 md:grid-cols-4 gap-0.5", children: mediaItems.slice(1, 5).map((item, index) => {
                        // Hide the 4th thumbnail (index 3) on mobile to maintain strictly 3 columns
                        const isFourthThumbnail = index === 3;
                        let overlay = undefined;
                        if (index === 2 && mediaItems.length > 4) {
                            // 3rd thumbnail on mobile
                            overlay = (_jsxs("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-text-inverse font-semibold text-lg pointer-events-none md:hidden", children: ["+", mediaItems.length - 4] }));
                        }
                        else if (index === 3 && mediaItems.length > 5) {
                            // 4th thumbnail on desktop
                            overlay = (_jsxs("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm hidden md:flex items-center justify-center text-text-inverse font-semibold text-lg pointer-events-none", children: ["+", mediaItems.length - 5] }));
                        }
                        return renderMediaItem(item, isFourthThumbnail ? 'hidden md:block' : undefined, overlay);
                    }) })] }));
    };
    const Media = !hideBuildingInfo && (mediaItems.length > 0 ? (_jsx("div", { className: `relative w-full max-w-full min-w-0 overflow-hidden bg-surface-muted ${!isCompact ? "md:w-[280px] md:shrink-0 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"}`, children: _jsx("div", { className: "absolute inset-0 w-full h-full", children: renderMediaGrid() }) })) : posterUrl && showCommunityImages ? (_jsx("div", { className: `relative w-full max-w-full min-w-0 bg-surface-muted overflow-hidden aspect-[4/3] ${!isCompact ? "md:aspect-auto md:w-[280px] md:shrink-0" : ""}`, children: _jsx("img", { src: posterUrl, alt: mainTitle || "", className: `w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${!isCompact ? "md:absolute md:inset-0" : ""}` }) })) : null);
    const ContentBody = isCompact ? (_jsxs(_Fragment, { children: [!hideBuildingInfo && (_jsxs("div", { className: "mb-1", children: [_jsx("h3", { className: "text-base font-bold text-text-primary line-clamp-2 leading-tight", children: mainTitle }), subTitle && (_jsx("p", { className: "text-xs text-text-secondary line-clamp-1 truncate", children: subTitle })), hideUser && entry.rating && entry.rating > 0 && (_jsx("div", { className: "flex items-center gap-1 mt-1", children: _jsx(RatingCircles, { rating: entry.rating }) }))] })), entry.content && (_jsxs("p", { className: "text-sm font-medium text-text-primary line-clamp-3 leading-relaxed", children: ["\"", entry.content, "\""] }))] })) : (_jsx(_Fragment, { children: entry.content && (_jsx("p", { className: "text-sm text-text-primary mb-2 leading-relaxed break-words", children: entry.content })) }));
    const Footer = (_jsxs("div", { className: `flex w-full max-w-full min-w-0 items-center gap-2 md:gap-4 flex-wrap ${isCompact ? "p-2.5 md:p-4 pt-3 mt-auto border-t border-border-default/50" : "mt-auto pt-3 border-t border-border-default/50"}`, children: [_jsxs("button", { onClick: (e) => {
                    e.stopPropagation();
                    onLike?.(entry.id);
                    window.dispatchEvent(new CustomEvent("pwa-interaction"));
                }, className: "flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors group/like", children: [_jsx(Heart, { className: `h-4 w-4 transition-transform group-hover/like:scale-110 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}` }), _jsx("span", { className: "text-xs font-medium", children: entry.likes_count })] }), _jsxs("button", { onClick: handleCommentClick, className: "flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors group/comment", children: [_jsx(MessageCircle, { className: "h-4 w-4 transition-transform group-hover/comment:scale-110" }), _jsx("span", { className: "text-xs font-medium", children: entry.comments_count })] }), !isCompact && (_jsxs("button", { onClick: handleSave, className: `flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors ml-auto ${isSaving ? "opacity-50" : ""}`, disabled: isSaving, children: [_jsx(Bookmark, { className: "h-4 w-4" }), _jsx("span", { className: "text-xs font-medium", children: "Save" })] }))] }));
    return (_jsx(SuggestedContentBlock, { isSuggested: entry.is_suggested, suggestionReason: entry.suggestion_reason, children: _jsx("article", { onClick: handleCardClick, className: `group/card relative flex flex-col ${!isCompact && hasMedia ? `${flexDirection} md:min-h-[220px]` : ""} h-full bg-surface-card border border-border-default rounded-sm overflow-hidden shadow-none hover:border-border-strong transition-colors cursor-pointer min-w-0 w-full max-w-full ${isArchitectOfBuilding ? "border-l-2 border-l-brand-primary" : ""}`, children: isCompact ? (_jsxs(_Fragment, { children: [Media, Header, _jsx("div", { className: "flex flex-col flex-1 min-w-0 p-2.5 md:p-4 md:pt-3 gap-2", children: ContentBody }), Footer] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col flex-1 min-w-0", children: [Header, _jsxs("div", { className: "flex flex-col flex-1 p-2.5 md:p-4 md:pt-3 gap-2", children: [ContentBody, Footer] })] }), Media] })) }) }));
}
