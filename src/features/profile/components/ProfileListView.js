import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { Heart } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger, } from "@/components/ui/hover-card";
import { getBuildingImageUrl } from "@/utils/image";
import { StatusBadge } from "./StatusBadge";
import { InlineRating } from "./InlineRating";
import { InlineReviewEditor } from "./InlineReviewEditor";
function getCityFromAddress(address) {
    if (!address)
        return "—";
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        return parts[parts.length - 2];
    }
    return parts[0];
}
export function ProfileListView({ data, isOwnProfile, onUpdate }) {
    const navigate = useNavigate();
    const { isMobile } = useSidebar();
    const handleRowClick = (review) => {
        if (review.building.id) {
            navigate(getBuildingUrl(review.building.id, review.building.slug, review.building.short_id));
        }
    };
    return (_jsx("div", { className: "-mx-4 overflow-x-auto", children: _jsxs(Table, { className: "min-w-full table-fixed", children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "h-10 hover:bg-transparent", children: [_jsx(TableHead, { className: "w-[70px] pl-4", children: isMobile ? "" : "Photo" }), _jsx(TableHead, { className: cn(isMobile ? "w-auto" : "w-[15%]"), children: "Name" }), !isMobile && _jsx(TableHead, { className: "w-[10%]", children: "Status" }), !isMobile && _jsx(TableHead, { className: "w-[10%]", children: "Points" }), !isMobile && _jsx(TableHead, { className: "w-[15%]", children: "Review" }), !isMobile && _jsx(TableHead, { className: "w-[15%]", children: "Architect" }), !isMobile && _jsx(TableHead, { className: "w-[10%]", children: "Year" }), !isMobile && _jsx(TableHead, { className: "w-[10%]", children: "Location" }), !isMobile && _jsx(TableHead, { className: "w-[10%]", children: "Country" }), !isMobile && _jsx(TableHead, { className: "w-[10%] pr-4 text-right", children: "Likes" })] }) }), _jsx(TableBody, { children: data.map((review) => {
                        const architectNames = review.building.architects && review.building.architects.length > 0
                            ? review.building.architects.map((a) => (typeof a === 'string' ? a : a.name)).join(", ")
                            : "—";
                        const location = review.building.city || getCityFromAddress(review.building.address);
                        const imageUrl = getBuildingImageUrl(review.building.main_image_url);
                        return (_jsxs(TableRow, { onClick: () => handleRowClick(review), className: cn("cursor-pointer transition-colors group", isMobile ? "h-auto" : "h-8"), children: [_jsx(TableCell, { className: "pl-4 py-1", children: imageUrl ? (_jsxs(HoverCard, { openDelay: 0, closeDelay: 0, children: [_jsx(HoverCardTrigger, { asChild: true, children: _jsx("div", { className: "flex items-center", children: _jsx("img", { src: imageUrl, alt: review.building.name, className: "w-8 h-8 rounded-md object-cover border border-border-default/50" }) }) }), _jsx(HoverCardContent, { className: "w-80 p-0 overflow-hidden rounded-md border-0 shadow-lg", side: "right", children: _jsx("img", { src: imageUrl, alt: review.building.name, className: "w-full h-auto object-cover" }) })] })) : (_jsx("div", { className: "w-8 h-8 rounded-md bg-surface-muted/50" })) }), _jsx(TableCell, { className: cn("font-medium text-text-primary py-1", !isMobile && "truncate"), children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "truncate", children: review.building.name }), isMobile && (_jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [_jsx(StatusBadge, { status: review.status, isOwnProfile: isOwnProfile && review.status !== 'lost', onClick: () => {
                                                            if (review.status === 'lost')
                                                                return;
                                                            const currentStatus = review.status || 'visited';
                                                            const newStatus = currentStatus === 'visited' ? 'pending' : 'visited';
                                                            onUpdate(review.id, { status: newStatus });
                                                        } }), _jsx(InlineRating, { rating: review.rating, onRate: (rating) => onUpdate(review.id, { rating }), readOnly: !isOwnProfile })] }))] }) }), !isMobile && (_jsxs(_Fragment, { children: [_jsx(TableCell, { className: "py-1", children: _jsx(StatusBadge, { status: review.status, isOwnProfile: isOwnProfile && review.status !== 'lost', onClick: () => {
                                                    if (review.status === 'lost')
                                                        return;
                                                    const currentStatus = review.status || 'visited';
                                                    const newStatus = currentStatus === 'visited' ? 'pending' : 'visited';
                                                    onUpdate(review.id, { status: newStatus });
                                                } }) }), _jsx(TableCell, { className: "py-1", children: _jsx(InlineRating, { rating: review.rating, onRate: (rating) => onUpdate(review.id, { rating }), readOnly: !isOwnProfile }) }), _jsx(TableCell, { className: "text-text-secondary py-1", children: _jsx(InlineReviewEditor, { initialContent: review.content, isOwnProfile: isOwnProfile, onSave: (content) => onUpdate(review.id, { content }) }) }), _jsx(TableCell, { className: "text-text-secondary py-1 truncate", children: architectNames }), _jsx(TableCell, { className: "text-text-secondary py-1", children: review.building.year_completed || "—" }), _jsx(TableCell, { className: "text-text-secondary py-1 truncate", children: location }), _jsx(TableCell, { className: "text-text-secondary py-1 truncate", children: review.building.country || "—" }), _jsx(TableCell, { className: "pr-4 text-right py-1", children: _jsxs("div", { className: "flex items-center justify-end gap-1 text-text-secondary", children: [_jsx(Heart, { className: cn("w-3 h-3", review.is_liked && "fill-brand-primary text-brand-primary") }), _jsx("span", { children: review.likes_count })] }) })] }))] }, review.id));
                    }) })] }) }));
}
