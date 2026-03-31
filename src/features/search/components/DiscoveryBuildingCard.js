import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EyeOff, Circle } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
export function DiscoveryBuildingCard({ building, socialContext: _socialContext, distance: _distance, action, onClick, imagePosition = 'right', target, }) {
    const imageUrl = getBuildingImageUrl(building.main_image_url);
    const { statuses, ratings } = useUserBuildingStatuses();
    const userStatus = statuses[building.id];
    const userRating = ratings[building.id];
    const isHidden = userStatus === 'ignored';
    const ImageComponent = imageUrl && (_jsx("div", { className: "relative w-32 shrink-0 aspect-[4/3] overflow-hidden", children: _jsx("img", { src: imageUrl, alt: building.name, className: "absolute inset-0 w-full h-full object-cover", loading: "lazy" }) }));
    const actionPositionClass = imagePosition === 'left' ? 'bottom-2 right-2' : 'top-2 right-2';
    const Content = (_jsxs(Card, { className: "overflow-hidden shadow-none transition-shadow group relative min-w-0", children: [action && (_jsx("div", { className: cn("absolute z-10", actionPositionClass), onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, children: action })), _jsxs("div", { className: "flex flex-row", children: [imagePosition === 'left' && ImageComponent, _jsxs("div", { className: "flex flex-col flex-1 p-3 justify-center min-w-0", children: [_jsxs("div", { className: "flex flex-col pr-6", children: [_jsx("h3", { className: "font-semibold text-base leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors", children: building.name }), building.alt_name && building.alt_name !== building.name && (_jsx("span", { className: "text-xs text-text-secondary line-clamp-1 italic", children: building.alt_name }))] }), _jsxs("div", { className: cn("text-xs text-text-secondary mt-1", imageUrl ? "line-clamp-2" : "line-clamp-1"), children: [building.city && (_jsxs(_Fragment, { children: [_jsx("span", { children: building.city }), _jsx("span", { children: " \u2022 " })] })), _jsx("span", { children: building.architects?.[0]?.name || "Unknown Architect" }), building.year_completed && (_jsxs(_Fragment, { children: [_jsx("span", { children: " \u2022 " }), _jsx("span", { children: building.year_completed })] }))] }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [(userStatus === 'visited' || userStatus === 'pending') && (_jsxs(Badge, { variant: "secondary", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-brand-primary/20 border max-w-full truncate", children: [userStatus === 'visited' ? "Visited" : "Saved", userRating && userRating > 0 && (_jsx("div", { className: "flex gap-0.5 ml-1", children: Array.from({ length: userRating }).map((_, i) => (_jsx(Circle, { className: "w-2 h-2 fill-current" }, i))) }))] })), (building.status === 'Lost' || building.status === 'Unbuilt') && (_jsx(Badge, { variant: "outline", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-text-secondary/30 max-w-full truncate", children: building.status })), isHidden && (_jsxs(Badge, { variant: "outline", className: "flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-dashed max-w-full truncate", children: [_jsx(EyeOff, { className: "h-3 w-3" }), "Hidden"] }))] }), building.contact_interactions && building.contact_interactions.length > 0 && (() => {
                                const sortedInteractions = [...building.contact_interactions].sort((a, b) => {
                                    const aHasAvatar = !!a.user.avatar_url;
                                    const bHasAvatar = !!b.user.avatar_url;
                                    if (aHasAvatar && !bHasAvatar)
                                        return -1;
                                    if (!aHasAvatar && bHasAvatar)
                                        return 1;
                                    return 0;
                                });
                                return (_jsxs("div", { className: "flex items-center gap-2 mt-2 min-w-0", children: [_jsx("div", { className: "flex -space-x-2 shrink-0", children: sortedInteractions.slice(0, 3).map((interaction) => (_jsxs(Avatar, { className: "w-5 h-5 border border-surface-default", children: [_jsx(AvatarImage, { src: interaction.user.avatar_url || undefined }), _jsx(AvatarFallback, { className: "text-[8px]", children: interaction.user.username?.[0] || interaction.user.first_name?.[0] || "?" })] }, interaction.user.id))) }), _jsx("span", { className: "text-xs text-text-secondary truncate", children: getInteractionText(sortedInteractions) })] }));
                            })()] }), imagePosition === 'right' && ImageComponent] })] }));
    if (onClick) {
        return (_jsx("div", { onClick: onClick, className: "block cursor-pointer", children: Content }));
    }
    return (_jsx(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id), className: "block", target: target, children: Content }));
}
function getInteractionText(interactions) {
    if (interactions.length === 0)
        return "";
    const getAction = (i) => {
        const hasRating = i.rating !== null && i.rating > 0;
        const isSaved = i.status === 'pending';
        const isVisited = i.status === 'visited';
        if (hasRating && isSaved)
            return "Prioritised";
        if (hasRating)
            return "Recommended";
        if (isSaved)
            return "Saved";
        if (isVisited)
            return "Visited";
        return "Interacted";
    };
    if (interactions.length === 1) {
        const i = interactions[0];
        const name = i.user.username || i.user.first_name || "Friend";
        const action = getAction(i);
        return `${action} by ${name}`;
    }
    const actions = interactions.map(getAction);
    const uniqueActions = Array.from(new Set(actions));
    if (uniqueActions.length === 1) {
        const action = uniqueActions[0];
        const firstUser = interactions[0].user.username || interactions[0].user.first_name || "Friend";
        return `${action} by ${firstUser} +${interactions.length - 1}`;
    }
    // Priority: Prioritised > Recommended > Saved > Visited
    const priority = {
        "Prioritised": 4,
        "Recommended": 3,
        "Saved": 2,
        "Visited": 1,
        "Interacted": 0
    };
    const sortedActions = uniqueActions.sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
    return sortedActions.slice(0, 2).join(" and ");
}
