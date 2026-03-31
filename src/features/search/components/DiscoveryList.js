import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from "react-router";
import { Building2, MapPinPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryBuildingCard } from "./DiscoveryBuildingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export function DiscoveryList({ buildings, isLoading, currentLocation, renderAction, onBuildingClick, emptyState, className, imagePosition, itemTarget, searchQuery, footer, }) {
    if (isLoading) {
        return (_jsx("div", { className: "space-y-4 p-4", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "flex flex-row h-auto overflow-hidden rounded-sm border border-border-default bg-surface-card text-text-primary shadow-none", children: [_jsx(Skeleton, { className: "w-32 h-32 shrink-0 rounded-none" }), _jsxs("div", { className: "flex-1 p-4 space-y-2", children: [_jsx(Skeleton, { className: "h-5 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/2" }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx(Skeleton, { className: "h-4 w-16" }), _jsx(Skeleton, { className: "h-4 w-20" })] })] })] }, i))) }));
    }
    if (buildings.length === 0) {
        if (emptyState) {
            return _jsx(_Fragment, { children: emptyState });
        }
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-4 text-center h-full min-h-[50vh]", children: [_jsx("div", { className: "bg-surface-muted rounded-full p-4 mb-4", children: _jsx(Building2, { className: "h-10 w-10 text-text-secondary" }) }), _jsx("h3", { className: "text-lg font-semibold", children: "No buildings found here yet" }), _jsx("p", { className: "text-text-secondary max-w-sm mt-1 mb-6", children: "Be the first to map this area." }), currentLocation && (_jsx(Button, { asChild: true, children: _jsxs(Link, { to: `/add-building?lat=${currentLocation.lat}&lng=${currentLocation.lng}`, children: [_jsx(MapPinPlus, { className: "mr-2 h-4 w-4" }), "Add Building Here"] }) }))] }));
    }
    return (_jsxs("div", { className: cn("space-y-4 p-4 pb-20 md:pb-4", className), children: [buildings.map((building) => (_jsx(DiscoveryBuildingCard, { building: building, distance: building.distance, socialContext: building.social_context ?? undefined, action: renderAction?.(building), onClick: onBuildingClick ? () => onBuildingClick(building) : undefined, imagePosition: imagePosition, target: itemTarget }, building.id))), footer, searchQuery && !footer && (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 gap-3 border-t mt-4", children: [_jsx("h3", { className: "text-sm font-medium text-text-secondary", children: "Not what you are looking for?" }), _jsx(Button, { asChild: true, variant: "outline", children: _jsxs(Link, { to: `/add-building?name=${encodeURIComponent(searchQuery)}${currentLocation ? `&lat=${currentLocation.lat}&lng=${currentLocation.lng}` : ''}`, children: [_jsx(MapPinPlus, { className: "mr-2 h-4 w-4" }), "Add \"", searchQuery, "\""] }) })] }))] }));
}
