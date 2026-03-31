import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useArchitect } from "@/features/architect/hooks/useArchitect";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MetaHead } from "@/components/common/MetaHead";
import { MapPin, Globe, Map as MapIcon, BadgeCheck } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { supabase } from "@/integrations/supabase/client";
import { ClaimProfileDialog } from "@/features/architect/components/ClaimProfileDialog";
export default function ArchitectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { architect, buildings, linkedUser, loading, error } = useArchitect(id);
    const [claimStatus, setClaimStatus] = useState({ is_verified: false, my_claim_status: null });
    const [claimDialogOpen, setClaimDialogOpen] = useState(false);
    const fetchClaimStatus = useCallback(async () => {
        if (!id)
            return;
        try {
            const { data, error } = await supabase.rpc('get_architect_claim_status', {
                p_architect_id: id
            });
            if (error)
                throw error;
            if (data) {
                setClaimStatus(data);
            }
        }
        catch (_err) {
        }
    }, [id]);
    useEffect(() => {
        fetchClaimStatus();
    }, [fetchClaimStatus, user]);
    if (loading) {
        return (_jsx(AppLayout, { showBack: true, children: _jsxs("div", { className: "px-4 py-6 md:px-6 space-y-8", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-10 w-1/3" }), _jsx(Skeleton, { className: "h-6 w-20" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [1, 2, 3, 4, 5, 6].map((i) => (_jsx(Card, { className: "overflow-hidden", children: _jsxs(CardContent, { className: "p-0", children: [_jsx(Skeleton, { className: "aspect-[4/3] w-full rounded-none" }), _jsxs("div", { className: "p-4 space-y-2", children: [_jsx(Skeleton, { className: "h-5 w-3/4" }), _jsx(Skeleton, { className: "h-4 w-1/2" })] })] }) }, i))) })] }) }));
    }
    // Redirect to user profile if linked
    if (linkedUser?.username) {
        return _jsx(Navigate, { to: `/profile/${linkedUser.username}`, replace: true });
    }
    const totalProjects = buildings.length;
    const builtWorks = buildings.filter(b => b.status === 'Built').length;
    if (error || !architect) {
        return (_jsx(AppLayout, { showBack: true, children: _jsxs("div", { className: "px-4 py-6 md:px-6 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: "Architect not found" }), _jsx("p", { className: "text-text-secondary", children: "The architect you are looking for does not exist or an error occurred." }), _jsx(Button, { asChild: true, variant: "secondary", children: _jsx(Link, { to: "/", children: "Return to Home" }) })] }) }));
    }
    return (_jsxs(AppLayout, { showBack: true, children: [_jsx(MetaHead, { title: architect.name }), _jsxs("div", { className: "px-4 py-6 md:py-10 max-w-7xl mx-auto animate-fade-in space-y-8", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: architect.name }), _jsxs("div", { className: "flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center", children: [_jsx("div", { className: "shrink-0 mx-auto md:mx-0", children: _jsxs(Avatar, { className: "h-24 w-24 md:h-40 md:w-40 border-2 border-border-default shadow-sm", children: [_jsx(AvatarImage, { src: buildings[0]?.main_image_url ? getBuildingImageUrl(buildings[0].main_image_url) : undefined, className: "object-cover" }), _jsx(AvatarFallback, { className: "text-3xl bg-surface-muted", children: architect.name?.charAt(0).toUpperCase() })] }) }), _jsxs("div", { className: "flex-1 min-w-0 w-full", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-center md:items-start gap-4 mb-4 md:mb-6", children: [_jsx("h2", { className: "text-xl md:text-2xl font-bold truncate min-w-0 max-w-[200px] md:max-w-none", children: _jsxs("span", { className: "flex items-center gap-2", children: [architect.name, claimStatus.is_verified && (_jsx("div", { className: "inline-flex items-center text-text-primary shrink-0", title: "Verified Architect", children: _jsx(BadgeCheck, { className: "w-5 h-5 md:w-6 md:h-6" }) }))] }) }), _jsxs("div", { className: "flex flex-wrap items-center justify-center md:justify-start gap-2 w-full md:w-auto mt-2 md:mt-0", children: [user && !claimStatus.is_verified && claimStatus.my_claim_status !== 'pending' && (_jsx(Button, { variant: "default", size: "sm", className: "h-8 px-5 font-semibold", onClick: () => setClaimDialogOpen(true), children: "Claim Profile" })), user && claimStatus.my_claim_status === 'pending' && (_jsx(Badge, { variant: "secondary", className: "h-8 px-4 font-medium", children: "Claim Pending" })), user && (_jsx(Button, { variant: "secondary", size: "sm", asChild: true, className: "h-8", children: _jsx(Link, { to: `/architect/${id}/edit`, children: "Edit" }) })), _jsx(Button, { variant: "secondary", size: "sm", asChild: true, className: "h-8", children: _jsxs(Link, { to: `/search?filters=${encodeURIComponent(JSON.stringify({ query: architect.name }))}`, children: [_jsx(MapIcon, { className: "h-4 w-4 md:mr-2" }), _jsx("span", { className: "hidden md:inline", children: "View on Map" })] }) }), architect.website_url && (_jsx(Button, { variant: "secondary", size: "sm", asChild: true, className: "h-8", children: _jsxs("a", { href: architect.website_url, target: "_blank", rel: "noopener noreferrer", children: [_jsx(Globe, { className: "h-4 w-4 md:mr-2" }), _jsx("span", { className: "hidden md:inline", children: "Website" })] }) }))] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 md:gap-10 mb-5 px-2 md:px-0 border-y md:border-none py-3 md:py-0 border-border-default/40", children: [_jsx(StatItem, { label: "total projects", value: totalProjects }), _jsx(StatItem, { label: "built works", value: builtWorks })] }), _jsxs("div", { className: "text-center md:text-left px-2 md:px-0", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3 text-sm text-text-secondary", children: [_jsx("div", { className: "flex items-center gap-1 group capitalize", children: architect.type }), architect.headquarters && (_jsxs("div", { className: "flex items-center gap-1 group", children: [_jsx(MapPin, { className: "h-4 w-4" }), _jsx("span", { children: architect.headquarters })] }))] }), architect.bio && (_jsx("p", { className: "text-sm leading-relaxed whitespace-pre-wrap mb-2 line-clamp-3 md:line-clamp-none", children: architect.bio }))] })] })] }), buildings.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 px-4 text-center bg-surface-muted/30 rounded-lg border border-dashed", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-4", children: _jsx(MapPin, { className: "h-6 w-6 text-text-secondary" }) }), _jsx("h3", { className: "text-lg font-semibold mb-1", children: "No designs listed yet" }), _jsx("p", { className: "text-text-secondary text-sm max-w-xs mx-auto", children: "We haven't added any buildings for this architect yet." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: buildings.map((building) => (_jsx(Card, { className: "overflow-hidden cursor-pointer shadow-none transition-shadow group", onClick: () => navigate(`/building/${building.id}`), children: _jsxs(CardContent, { className: "p-0", children: [_jsx(AspectRatio, { ratio: 4 / 3, children: getBuildingImageUrl(building.main_image_url) ? (_jsx("img", { src: getBuildingImageUrl(building.main_image_url), alt: building.name, className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full bg-surface-muted flex items-center justify-center text-text-secondary", children: "No Image" })) }), _jsxs("div", { className: "p-4 space-y-1", children: [_jsx("h3", { className: "font-semibold text-lg line-clamp-1", children: building.name }), _jsx("p", { className: "text-sm text-text-secondary", children: [building.city, building.country].filter(Boolean).join(", ") }), building.year_completed && (_jsx("p", { className: "text-xs text-text-secondary pt-1", children: building.year_completed }))] })] }) }, building.id))) }))] }), _jsx(ClaimProfileDialog, { architectId: id || "", architectName: architect.name, open: claimDialogOpen, onOpenChange: setClaimDialogOpen, onSuccess: fetchClaimStatus })] }));
}
function StatItem({ label, value, onClick }) {
    const content = (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-bold text-base md:text-md text-text-primary group-hover:text-brand-primary transition-colors", children: formatStatValue(value) }), _jsx("span", { className: "text-xs md:text-sm text-text-secondary capitalize", children: label })] }));
    if (onClick) {
        return _jsx("button", { onClick: onClick, className: "flex flex-col md:flex-row items-center gap-1 group", children: content });
    }
    return _jsx("div", { className: "flex flex-col md:flex-row items-center gap-1 group", children: content });
}
function formatStatValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toString();
}
