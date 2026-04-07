/**
 * BuildingSidebar.tsx — Redesigned with A24 editorial aesthetic
 *
 * Visual changes (all data-fetching, pagination, map interaction logic unchanged):
 *
 * Row containers:
 *   Card + CardContent removed from all three row types (architects, locations,
 *   buildings). Content now floats directly on the sidebar surface with
 *   border-b border-border-default dividers between rows — the editorial rule
 *   that structure comes from typography and borders, not card containers.
 *
 * Building rows:
 *   group-hover:text-brand-primary → group-hover:opacity-70 transition-opacity
 *   (monochromatic content surface — no neon on hover).
 *   Rating dots: rounded-full bg-brand-primary → bg-text-primary (no rounding,
 *   monochromatic). Per DESIGN_TOKENS: brand-primary must not appear as active
 *   state fill on content pages.
 *   Status badge: rounded-full pill → plain text-2xs text-text-disabled label.
 *   Image thumbnail: flush to right edge (pr-0 on row), sharp crop.
 *
 * Location suggestion rows:
 *   rounded-full bg-brand-primary/10 icon container removed — MapPin icon
 *   renders directly, text-text-secondary (not text-brand-primary).
 *   "Location" sub-label removed — it added no information.
 *
 * Architect rows:
 *   rounded-full icon container removed — UserRound icon renders directly.
 *   group-hover:text-brand-primary → opacity transition.
 *
 * Section labels:
 *   text-xs font-semibold tracking-wider → text-2xs font-medium tracking-widest
 *   uppercase text-text-secondary. Matches DESIGN_TOKENS "page section label".
 *
 * Loading: text-brand-primary → text-text-disabled.
 * CTAs: Button variant="outline" → bare text-xs uppercase tracking-widest CTA.
 * Infinite scroll loader: h-4 w-4 text-text-secondary (unchanged — already minimal).
 */
import { useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useMapContext } from '../providers/MapContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MapPin, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { getBuildingImageUrl } from '@/utils/image';
import { Suggestion } from '@/features/search/components/DiscoverySearchInput';
import { ArchitectSearchResult } from '@/features/search/hooks/useArchitectSearch';
import { getBoundsFromBuildings } from '@/utils/map';
import { cn } from '@/lib/utils';

interface Building {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  rating: number;
  status: string | null;
  lat: number;
  lng: number;
  architects: string[];
  year_completed: number | null;
  city: string | null;
  country: string | null;
  alt_name?: string | null;
}

interface BuildingSidebarProps {
  topLocation?: { description: string; place_id: string } | null;
  onLocationClick?: (placeId: string) => void;
  suggestions?: Suggestion[];
  architects?: ArchitectSearchResult[];
  className?: string;
}

const PAGE_SIZE = 20;

export function BuildingSidebar({
  topLocation,
  onLocationClick,
  suggestions,
  architects,
  className,
}: BuildingSidebarProps = {}) {
  const {
    state: { bounds, filters },
    methods: { setHighlightedId, fitMapBounds },
  } = useMapContext();
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastZoomedQuery = useRef<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
  } = useInfiniteQuery({
    queryKey: ['buildings-list', bounds, filters],
    queryFn: async ({ pageParam = 1 }) => {
      if (!bounds) return [];
      const filterCriteria = {
        query: filters.query,
        category_id: filters.category,
        typology_ids: filters.typologies,
        attribute_ids: filters.attributes,
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
      if (error) throw error;
      return (data as unknown as Building[]) ?? [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    enabled: !!bounds,
    initialPageParam: 1,
    placeholderData: keepPreviousData,
  });

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-zoom on search
  useEffect(() => {
    if (filters.query && !isFetching && data && data.pages?.[0]?.length) {
      if (filters.query !== lastZoomedQuery.current) {
        const allBuildings = data.pages.flat();
        const mappedBuildings = allBuildings.map(b => ({
          location_lat: b.lat,
          location_lng: b.lng,
        }));
        const newBounds = getBoundsFromBuildings(mappedBuildings);
        if (newBounds) {
          fitMapBounds(newBounds);
          lastZoomedQuery.current = filters.query;
        }
      }
    } else if (!filters.query) {
      lastZoomedQuery.current = null;
    }
  }, [filters.query, isFetching, data, fitMapBounds]);

  const buildings = useMemo(() => {
    const allBuildings = data?.pages.flat() || [];
    return [...allBuildings].sort((a, b) => {
      const isHiddenA = a.status === 'ignored';
      const isHiddenB = b.status === 'ignored';
      if (isHiddenA && !isHiddenB) return 1;
      if (!isHiddenA && isHiddenB) return -1;
      return 0;
    });
  }, [data?.pages]);

  return (
    <div className={cn("h-full w-full min-w-0 bg-surface-card border-l border-border-default", className)}>
      <ScrollArea className="h-full w-full">
        <div className="pt-2 pb-6">

          {/* ── Architect results ── */}
          {architects && architects.length > 0 && (
            <div>
              <p className="px-4 pt-4 pb-2 text-2xs font-medium tracking-widest uppercase text-text-secondary">
                Architects
              </p>
              {architects.map((architect) => (
                <Link
                  to={`/architect/${architect.id}`}
                  key={architect.id}
                  className="group flex items-center gap-3 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/40 transition-colors"
                >
                  <UserRound className="h-4 w-4 text-text-disabled shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight text-text-primary group-hover:opacity-70 transition-opacity truncate">
                      {architect.name}
                    </p>
                    {architect.type && (
                      <p className="text-xs text-text-disabled capitalize mt-0.5">
                        {architect.type}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              <div className="h-px bg-border-default mx-4 my-2" />
            </div>
          )}

          {/* ── Location suggestions ── */}
          {suggestions && suggestions.length > 0 ? (
            <div>
              <p className="px-4 pt-4 pb-2 text-2xs font-medium tracking-widest uppercase text-text-secondary">
                Jump to location
              </p>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => onLocationClick?.(suggestion.place_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/40 transition-colors text-left"
                >
                  <MapPin className="h-3.5 w-3.5 text-text-disabled shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-text-primary truncate flex-1">{suggestion.description}</p>
                </button>
              ))}
              <div className="h-px bg-border-default mx-4 my-2" />
            </div>
          ) : topLocation ? (
            <div>
              <p className="px-4 pt-4 pb-2 text-2xs font-medium tracking-widest uppercase text-text-secondary">
                Jump to location
              </p>
              <button
                type="button"
                onClick={() => onLocationClick?.(topLocation.place_id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-border-default hover:bg-surface-muted/40 transition-colors text-left"
              >
                <MapPin className="h-3.5 w-3.5 text-text-disabled shrink-0" strokeWidth={1.5} />
                <p className="text-sm text-text-primary truncate flex-1">{topLocation.description}</p>
              </button>
              <div className="h-px bg-border-default mx-4 my-2" />
            </div>
          ) : null}

          {/* ── Building results ── */}
          {!bounds || isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
            </div>
          ) : isError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-feedback-destructive">Failed to load buildings</p>
            </div>
          ) : buildings.length === 0 ? (
            <div className="px-4 py-12 text-center space-y-3">
              <p className="text-sm text-text-disabled">No buildings found in this area</p>
              <Link
                to="/add-building"
                className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
              >
                Add building →
              </Link>
            </div>
          ) : (
            <>
              <p className="px-4 pt-4 pb-2 text-2xs font-medium tracking-widest uppercase text-text-secondary">
                Buildings
              </p>

              {buildings.map((building) => {
                const imageUrl = getBuildingImageUrl(building.image_url);
                return (
                  <Link
                    to={`/building/${building.slug || building.id}`}
                    key={building.id}
                    className="group flex pl-4 pr-0 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/30 transition-colors"
                    onMouseEnter={() => setHighlightedId(building.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  >
                    {/* Text content */}
                    <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center min-h-[72px]">
                      <h3
                        className="line-clamp-2 text-sm font-semibold leading-tight text-text-primary group-hover:opacity-70 transition-opacity"
                        title={building.name}
                      >
                        {building.name}
                      </h3>
                      {building.alt_name && building.alt_name !== building.name && (
                        <span className="max-w-search-serp-alt truncate text-xs italic text-text-secondary mt-0.5">
                          {building.alt_name}
                        </span>
                      )}

                      {/* Architect, year, location */}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {building.architects && building.architects.length > 0 && (
                          <p className="text-xs text-text-secondary line-clamp-1">
                            {building.architects.join(', ')}
                          </p>
                        )}
                        {(building.city || building.country || building.year_completed) && (
                          <p className="text-xs text-text-disabled line-clamp-1">
                            {[building.city, building.country, building.year_completed]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>

                      {/* Status + rating */}
                      {((building.status && building.status !== 'none') || building.rating > 0) && (
                        <div className="mt-1.5 flex items-center gap-3">
                          {building.status && building.status !== 'none' && (
                            <span className="text-2xs font-medium uppercase tracking-wide text-text-disabled capitalize">
                              {building.status}
                            </span>
                          )}
                          {building.rating > 0 && (
                            <div className="flex gap-0.5" aria-label={`Rating: ${building.rating}`}>
                              {Array.from({ length: building.rating }).map((_, i) => (
                                // Monochromatic, sharp — no rounded-full, no brand-primary
                                <div key={i} className="h-1.5 w-1.5 bg-text-primary" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image — flush to right edge */}
                    <div className="relative w-24 shrink-0 bg-surface-muted overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={building.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xs text-text-disabled">
                          No image
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="flex h-8 w-full items-center justify-center py-2">
                {isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
                )}
              </div>

              {/* End of results */}
              {!hasNextPage && buildings.length > 0 && (
                <div className="px-4 py-10 text-center space-y-3">
                  <p className="text-xs text-text-disabled">End of results</p>
                  <Link
                    to="/add-building"
                    className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
                  >
                    Add a building →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}