import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDiscoveryFeed } from "@/features/feed/hooks/useDiscoveryFeed";
import { DiscoveryCard } from "@/features/feed/components/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExploreTutorial } from "@/features/search/components/ExploreTutorial";
import { AppLayout } from "@/components/layout/AppLayout";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
export default function Explore() {
    const queryClient = useQueryClient();
    const { user, loading: authLoading } = useAuth();
    const { state } = useSidebar();
    const [showTutorial, setShowTutorial] = useState(false);
    // Filter state
    const [locationFilter, setLocationFilter] = useState({ city: null, country: null, region: null, label: null });
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const scrollContainerRef = useRef(null);
    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem("explore-tutorial-seen");
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useDiscoveryFeed({
        city: locationFilter.city,
        country: locationFilter.country,
        region: locationFilter.region
    });
    const { containerRef, isVisible } = useIntersectionObserver();
    useEffect(() => {
        if (isVisible && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [isVisible, hasNextPage, isFetchingNextPage]);
    // Scroll handler
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollTop = scrollContainerRef.current.scrollTop;
            // Hide if scrolled down more than 50px
            if (scrollTop > 50) {
                setIsFilterVisible(false);
            }
            else {
                setIsFilterVisible(true);
            }
        }
    };
    // Place details handler
    const handlePlaceDetails = (details) => {
        let city = null;
        let country = null;
        let region = null;
        let label = details.formatted_address;
        details.address_components.forEach(comp => {
            if (comp.types.includes('locality')) {
                city = comp.long_name;
            }
            if (comp.types.includes('country')) {
                country = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
                region = comp.long_name;
            }
        });
        // Smart label
        if (city) {
            label = city;
        }
        else if (region) {
            label = region;
        }
        else if (country) {
            label = country;
        }
        setLocationFilter({
            city,
            country,
            region,
            label
        });
        setIsDrawerOpen(false);
        setSearchValue(""); // Clear search input
        // Reset scroll to top
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };
    const clearFilter = (e) => {
        e.stopPropagation();
        setLocationFilter({ city: null, country: null, region: null, label: null });
    };
    // Extract flattened list
    const allBuildings = data?.pages.flat() || [];
    // Manage hidden buildings (swiped away)
    const [hiddenBuildingIds, setHiddenBuildingIds] = useState(new Set());
    const buildings = useMemo(() => allBuildings.filter(b => !hiddenBuildingIds.has(b.id)), [allBuildings, hiddenBuildingIds]);
    const handleSkip = async (buildingId) => {
        try {
            if (!user)
                return;
            const { error } = await supabase.from("user_buildings").upsert({
                user_id: user.id,
                building_id: buildingId,
                status: 'ignored',
                edited_at: new Date().toISOString()
            }, { onConflict: 'user_id, building_id' });
            if (error)
                throw error;
        }
        catch (_error) {
        }
    };
    const handleSwipeSave = async (buildingId) => {
        setHiddenBuildingIds(prev => {
            const next = new Set(prev);
            next.add(buildingId);
            return next;
        });
        toast.success("Saved to your list");
        try {
            if (!user)
                return;
            const { error } = await supabase.from("user_buildings").upsert({
                user_id: user.id,
                building_id: buildingId,
                status: 'pending',
                edited_at: new Date().toISOString()
            }, { onConflict: 'user_id, building_id' });
            if (error)
                throw error;
            queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
        }
        catch (_error) {
            toast.error("Failed to save");
        }
    };
    const handleSwipeHide = async (buildingId) => {
        setHiddenBuildingIds(prev => {
            const next = new Set(prev);
            next.add(buildingId);
            return next;
        });
        try {
            if (!user)
                return;
            const { error } = await supabase.from("user_buildings").upsert({
                user_id: user.id,
                building_id: buildingId,
                status: 'ignored',
                edited_at: new Date().toISOString()
            }, { onConflict: 'user_id, building_id' });
            if (error)
                throw error;
            queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
        }
        catch (_error) {
            toast.error("Failed to skip building");
        }
    };
    if (!authLoading && !user) {
        return _jsx(Navigate, { to: "/auth", replace: true });
    }
    return (_jsx("div", { className: cn("transition-[margin-left] duration-200 ease-linear w-auto", state === "expanded" ? "md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]" : "md:ml-0"), children: _jsxs(AppLayout, { isFullScreen: true, showHeader: false, children: [showTutorial && _jsx(ExploreTutorial, { onComplete: () => setShowTutorial(false) }), _jsx("div", { className: "fixed left-4 top-4 z-50 md:hidden pointer-events-auto", children: _jsx(SidebarTrigger, { className: "bg-surface-card/95 shadow-md border border-border-default", "aria-label": "Open menu" }) }), _jsx("div", { className: cn("fixed top-4 left-0 right-0 z-50 flex justify-center transition-all duration-300 pointer-events-none", isFilterVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"), children: _jsx("div", { className: "pointer-events-auto", children: _jsxs(Drawer, { open: isDrawerOpen, onOpenChange: setIsDrawerOpen, children: [_jsx(DrawerTrigger, { asChild: true, children: _jsxs(Button, { variant: "secondary", className: locationFilter.label
                                            ? "rounded-sm shadow-lg border border-border-default bg-brand-primary text-brand-primary-foreground pl-3 pr-4 h-10 gap-2 text-sm font-medium hover:opacity-90"
                                            : "rounded-sm shadow-lg bg-black/50 backdrop-blur-md text-text-inverse border border-white/20 hover:bg-black/70 pl-3 pr-4 h-10 gap-2", children: [_jsx(MapPin, { className: locationFilter.label ? "h-4 w-4" : "h-4 w-4 text-text-inverse/80" }), _jsx("span", { className: "max-w-[200px] truncate font-medium", children: locationFilter.label || "World" }), locationFilter.label && (_jsx("span", { role: "button", tabIndex: 0, "aria-label": "Clear location filter", onClick: (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    clearFilter(e);
                                                }, onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        clearFilter(e);
                                                    }
                                                }, className: "ml-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-brand-primary-foreground hover:bg-black/10", children: _jsx(X, { className: "h-3 w-3" }) }))] }) }), _jsxs(DrawerContent, { className: "h-[80vh] bg-surface-default text-text-primary", children: [_jsx(DrawerHeader, { children: _jsx(DrawerTitle, { className: "text-lg font-semibold text-text-primary", children: "Filter by Location" }) }), _jsx("div", { className: "p-4 pt-0", children: _jsx(DiscoverySearchInput, { value: searchValue, onSearchChange: setSearchValue, onLocationSelect: () => { }, onPlaceDetails: handlePlaceDetails, placeholder: "Search city, region, or country...", className: "w-full" }) })] })] }) }) }), _jsx("div", { className: "relative h-[calc(100vh-80px)] md:h-screen w-full bg-[#0A0A0A] /* palette-neutral-950 */ text-text-inverse overflow-hidden", children: _jsxs("div", { ref: scrollContainerRef, onScroll: handleScroll, className: "h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar", children: [status === "pending" ? (_jsx("div", { className: "h-full w-full flex items-center justify-center snap-center", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-inverse/70" }) })) : status === 'error' ? (_jsx("div", { className: "h-full w-full flex items-center justify-center snap-center text-feedback-destructive", children: "Failed to load feed" })) : buildings.length === 0 ? (_jsxs("div", { className: "h-full w-full flex flex-col items-center justify-center text-center snap-center py-16 px-8 gap-4", children: [_jsx(MapPin, { className: "h-12 w-12 text-text-inverse/40" }), _jsx("p", { className: "text-lg font-semibold text-text-inverse", children: "No buildings found" }), _jsx("p", { className: "text-sm text-text-inverse/80 max-w-sm", children: "Try widening your location filter or check back later." })] })) : (buildings.map((building) => (_jsx("div", { className: "h-full w-full snap-start snap-always", children: _jsx(DiscoveryCard, { building: building, onSwipeSave: () => handleSwipeSave(building.id), onSwipeHide: () => handleSwipeHide(building.id), onSkip: () => handleSkip(building.id) }) }, building.id)))), (hasNextPage || isFetchingNextPage) && (_jsx("div", { ref: containerRef, className: "h-20 w-full flex justify-center items-center p-4 snap-end", children: isFetchingNextPage && _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-inverse/60" }) }))] }) })] }) }));
}
