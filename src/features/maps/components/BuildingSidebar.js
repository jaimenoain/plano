import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useMapContext } from '../providers/MapContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBuildingImageUrl } from '@/utils/image';
import { Button } from '@/components/ui/button';
import { getBoundsFromBuildings } from '@/utils/map';
import { cn } from '@/lib/utils';
const PAGE_SIZE = 20;
export function BuildingSidebar({ topLocation, onLocationClick, suggestions, architects, className } = {}) {
    const { state: { bounds, filters }, methods: { setHighlightedId, fitMapBounds } } = useMapContext();
    const observerTarget = useRef(null);
    // Keep track of the last query processed for zooming
    const lastZoomedQuery = useRef(null);
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, isError, } = useInfiniteQuery({
        queryKey: ['buildings-list', bounds, filters],
        queryFn: async ({ pageParam = 1 }) => {
            // If bounds are not yet available (e.g. initial load), return empty
            if (!bounds)
                return [];
            // Construct filter criteria matching the RPC expectation
            const filterCriteria = {
                query: filters.query,
                category_id: filters.category, // Corrected key
                typology_ids: filters.typologies, // Corrected key
                attribute_ids: filters.attributes, // Corrected key
                architect_ids: filters.architects?.map((a) => a.id),
                status: filters.status,
                min_rating: filters.minRating,
                personal_min_rating: filters.personalMinRating,
                rated_by: filters.contacts?.map((c) => c.name) || filters.ratedBy,
                filter_contacts: filters.filterContacts,
                collections: filters.collections?.map((c) => c.id),
                hide_visited: filters.hideVisited,
                hide_saved: filters.hideSaved,
                hide_hidden: false,
                hide_without_images: filters.hideWithoutImages,
                contact_min_rating: filters.contactMinRating,
            };
            const { data, error } = await supabase.rpc('get_buildings_list', {
                min_lat: bounds.south,
                min_lng: bounds.west,
                max_lat: bounds.north,
                max_lng: bounds.east,
                filter_criteria: filterCriteria,
                page: pageParam,
                page_size: PAGE_SIZE,
            });
            if (error) {
                throw error;
            }
            return data;
        },
        getNextPageParam: (lastPage, allPages) => {
            // If the last page has fewer items than PAGE_SIZE, we've reached the end
            return lastPage && lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
        },
        // Only fetch if bounds are valid
        enabled: !!bounds,
        initialPageParam: 1,
        placeholderData: keepPreviousData,
    });
    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        }, { threshold: 0.1 });
        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }
        return () => {
            if (currentTarget)
                observer.unobserve(currentTarget);
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    // Handle auto-zoom on search
    useEffect(() => {
        // Only proceed if we have a query, data is fresh (!isFetching), and we have results
        if (filters.query && !isFetching && data && data.pages?.[0]?.length) {
            // If query changed since last zoom
            if (filters.query !== lastZoomedQuery.current) {
                const allBuildings = data.pages.flat();
                // Map to format expected by getBoundsFromBuildings
                const mappedBuildings = allBuildings.map(b => ({
                    location_lat: b.lat,
                    location_lng: b.lng
                }));
                const newBounds = getBoundsFromBuildings(mappedBuildings);
                if (newBounds) {
                    fitMapBounds(newBounds);
                    lastZoomedQuery.current = filters.query;
                }
            }
        }
        else if (!filters.query) {
            // Reset if query is cleared so we can zoom again if typed again
            lastZoomedQuery.current = null;
        }
    }, [filters.query, isFetching, data, fitMapBounds]);
    // Sort buildings: Hidden (ignored) items go to the bottom
    const buildings = useMemo(() => {
        const allBuildings = data?.pages.flat() || [];
        return [...allBuildings].sort((a, b) => {
            const isHiddenA = a.status === 'ignored';
            const isHiddenB = b.status === 'ignored';
            if (isHiddenA && !isHiddenB)
                return 1;
            if (!isHiddenA && isHiddenB)
                return -1;
            return 0;
        });
    }, [data?.pages]);
    return (_jsx(ScrollArea, { className: "h-full w-full", children: _jsxs("div", { className: cn("space-y-4 p-4", className), children: [architects && architects.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider px-1", children: "Architects" }), architects.map((architect) => (_jsx(Link, { to: `/architect/${architect.id}`, className: "block group", children: _jsx(Card, { className: "flex flex-row overflow-hidden transition-all duration-200 shadow-none border-transparent hover:border-border-default/50 hover:bg-surface-muted/50 bg-surface-muted/30", children: _jsxs(CardContent, { className: "flex items-center gap-3 p-3 w-full", children: [_jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-secondary-foreground", children: _jsx(UserRound, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "line-clamp-1 text-sm font-semibold group-hover:text-brand-primary transition-colors", children: architect.name }), _jsx("span", { className: "text-xs text-text-secondary capitalize", children: architect.type })] })] }) }) }, architect.id))), _jsx("div", { className: "h-px bg-border my-4" })] })), suggestions && suggestions.length > 0 ? (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider px-1", children: "Jump to Location" }), suggestions.map((suggestion) => (_jsx(Card, { className: "cursor-pointer overflow-hidden border-transparent bg-surface-muted/30 hover:bg-surface-muted/50 transition-colors", onClick: () => onLocationClick?.(suggestion.place_id), children: _jsxs(CardContent, { className: "flex items-center gap-3 p-3", children: [_jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10", children: _jsx(MapPin, { className: "h-4 w-4 text-brand-primary" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-sm truncate", children: suggestion.description }), _jsx("p", { className: "text-xs text-text-secondary", children: "Location" })] })] }) }, suggestion.place_id))), _jsx("div", { className: "h-px bg-border my-4" })] })) : topLocation ? (_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider px-1", children: "Jump to Location" }), _jsx(Card, { className: "cursor-pointer overflow-hidden border-transparent bg-surface-muted/30 hover:bg-surface-muted/50 transition-colors", onClick: () => onLocationClick?.(topLocation.place_id), children: _jsxs(CardContent, { className: "flex items-center gap-3 p-3", children: [_jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10", children: _jsx(MapPin, { className: "h-4 w-4 text-brand-primary" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-sm truncate", children: topLocation.description }), _jsx("p", { className: "text-xs text-text-secondary", children: "Location" })] })] }) }), _jsx("div", { className: "h-px bg-border my-4" })] })) : null, !bounds || isLoading ? (_jsx("div", { className: "flex items-center justify-center p-8", children: (!bounds || isLoading) && _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) })) : isError ? (_jsx("div", { className: "text-center text-feedback-destructive p-4", children: _jsx("p", { children: "Failed to load buildings." }) })) : buildings.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 p-8 text-center", children: [_jsx("p", { className: "text-text-secondary", children: "No buildings found in this area." }), _jsx(Button, { variant: "outline", asChild: true, children: _jsx(Link, { to: "/add-building", children: "Add building" }) })] })) : (_jsxs(_Fragment, { children: [_jsx("h4", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider px-1", children: "Buildings" }), buildings.map((building) => {
                            const imageUrl = getBuildingImageUrl(building.image_url);
                            return (_jsx(Link, { to: `/building/${building.slug || building.id}`, className: "block group", children: _jsxs(Card, { className: "flex flex-row overflow-hidden transition-all duration-200 shadow-none border-transparent hover:border-border-default/50 min-h-[7rem]", onMouseEnter: () => setHighlightedId(building.id), onMouseLeave: () => setHighlightedId(null), children: [_jsxs(CardContent, { className: "flex-1 min-w-0 p-3 flex flex-col justify-center", children: [_jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { className: "flex flex-col", children: [_jsx("h3", { className: "line-clamp-2 text-sm font-semibold leading-tight group-hover:text-brand-primary", title: building.name, children: building.name }), building.alt_name && building.alt_name !== building.name && (_jsx("span", { className: "text-xs text-text-secondary italic truncate max-w-[200px]", children: building.alt_name }))] }) }), _jsxs("div", { className: "mt-1 flex flex-col gap-0.5", children: [building.architects && building.architects.length > 0 && (_jsx("p", { className: "text-xs text-text-secondary line-clamp-1", children: building.architects.join(', ') })), (building.city || building.country || building.year_completed) && (_jsx("p", { className: "text-xs text-text-secondary line-clamp-1", children: [
                                                                building.city,
                                                                building.country,
                                                                building.year_completed
                                                            ].filter(Boolean).join(' • ') }))] }), ((building.status && building.status !== 'none') || building.rating > 0) && (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [building.status && building.status !== 'none' && (_jsx("span", { className: "inline-flex items-center rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground capitalize", children: building.status })), building.rating > 0 && (_jsx("div", { className: "flex gap-1", "aria-label": `Rating: ${building.rating} stars`, children: Array.from({ length: building.rating }).map((_, i) => (_jsx("div", { className: "h-2 w-2 rounded-full bg-brand-primary" }, i))) }))] }))] }), _jsx("div", { className: "relative w-28 shrink-0 bg-surface-muted overflow-hidden", children: imageUrl ? (_jsx("img", { src: imageUrl, alt: building.name, className: "absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105", loading: "lazy" })) : (_jsx("div", { className: "flex h-full items-center justify-center text-text-secondary text-[10px]", children: "No Image" })) })] }) }, building.id));
                        }), _jsx("div", { ref: observerTarget, className: "flex h-8 w-full items-center justify-center py-2", children: isFetchingNextPage && _jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" }) }), !hasNextPage && buildings.length > 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-8 text-center", children: [_jsx("p", { className: "text-sm text-text-secondary", children: "Not finding what you're looking for?" }), _jsx(Button, { variant: "outline", asChild: true, children: _jsx(Link, { to: "/add-building", children: "Add building" }) })] }))] }))] }) }));
}
