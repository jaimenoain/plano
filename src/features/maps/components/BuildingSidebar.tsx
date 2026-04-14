/**
 * BuildingSidebar.tsx — Redesigned with A24 editorial aesthetic
 *
 * Visual changes (all data-fetching, pagination, map interaction logic unchanged):
 *
 * Row containers:
 *   Card + CardContent removed from all three row types (credits line, locations,
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
 *   Image thumbnail: inset from right column edge (pr-3 on row), sharp crop.
 *
 * Location suggestion rows:
 *   rounded-full bg-brand-primary/10 icon container removed — MapPin icon
 *   renders directly, text-text-secondary (not text-brand-primary).
 *   "Location" sub-label removed — it added no information.
 *
 * People-result rows:
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
import { useEffect, useRef, useMemo, useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useMapContext } from '../providers/MapContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, UserRound, Building2 } from 'lucide-react';
import { Link } from 'react-router';
import { getBuildingImageUrl, getStorageAssetUrl } from '@/utils/image';
import { Suggestion } from '@/features/search/components/DiscoverySearchInput';
import type { CompanySummary, PersonSummary } from '@/features/credits/types';
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
  credit_names: string[];
  year_completed: number | null;
  city: string | null;
  country: string | null;
  alt_name?: string | null;
}

type SearchResultTab = 'buildings' | 'people' | 'companies';

interface BuildingSidebarProps {
  topLocation?: { description: string; place_id: string } | null;
  onLocationClick?: (placeId: string) => void;
  suggestions?: Suggestion[];
  people?: PersonSummary[];
  companies?: CompanySummary[];
  className?: string;
}

const PAGE_SIZE = 20;

export function BuildingSidebar({
  topLocation,
  onLocationClick,
  suggestions,
  people = [],
  companies = [],
  className,
}: BuildingSidebarProps = {}) {
  const {
    state: { bounds, filters },
    methods: { setHighlightedId, fitMapBounds },
  } = useMapContext();
  const observerTarget = useRef<HTMLDivElement>(null);
  const lastZoomedQuery = useRef<string | null>(null);
  const [resultTab, setResultTab] = useState<SearchResultTab>('buildings');

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
        architect_ids: filters.people?.map((p) => p.id),
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
        credit_company_id: filters.creditCompany?.id ?? undefined,
        credit_roles:
          filters.creditRoles && filters.creditRoles.length > 0 ? filters.creditRoles : undefined,
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

  const peopleCount = people.length;
  const companiesCount = companies.length;

  return (
    <div className={cn("h-full w-full min-w-0 bg-surface-card border-l border-border-default flex flex-col min-h-0", className)}>
      <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as SearchResultTab)} className="flex h-full min-h-0 flex-col">
        <TabsList className="mx-2 mt-2 mb-0 h-auto shrink-0 flex w-auto flex-wrap justify-start gap-1 rounded-none border-0 bg-transparent p-0">
          <TabsTrigger
            value="buildings"
            className="rounded-sm px-3 py-1.5 text-2xs font-medium uppercase tracking-widest data-[state=active]:bg-surface-muted data-[state=inactive]:text-text-secondary"
          >
            Buildings
          </TabsTrigger>
          <TabsTrigger
            value="people"
            className="rounded-sm px-3 py-1.5 text-2xs font-medium uppercase tracking-widest data-[state=active]:bg-surface-muted data-[state=inactive]:text-text-secondary"
          >
            People ({peopleCount})
          </TabsTrigger>
          <TabsTrigger
            value="companies"
            className="rounded-sm px-3 py-1.5 text-2xs font-medium uppercase tracking-widest data-[state=active]:bg-surface-muted data-[state=inactive]:text-text-secondary"
          >
            Companies ({companiesCount})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1 w-full">
          <TabsContent value="buildings" className="m-0 mt-0 outline-none">
            <div className="pt-2 pb-6">

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
              {buildings.map((building) => {
                const imageUrl = getBuildingImageUrl(building.image_url);
                return (
                  <Link
                    to={building.slug ? `/building/${building.slug}` : `/building/${building.id}`}
                    key={building.id}
                    className="group flex pl-4 pr-3 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/30 transition-colors"
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

                      {/* Architect (credits) and locality (city only) */}
                      <div className="mt-1 flex flex-col gap-0.5">
                        {building.credit_names && building.credit_names.length > 0 && (
                          <p className="text-xs text-text-secondary line-clamp-1">
                            {building.credit_names.join(', ')}
                          </p>
                        )}
                        {building.city ? (
                          <p className="text-xs text-text-disabled line-clamp-1">{building.city}</p>
                        ) : null}
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
                                // Monochromatic circles — rounded-full, no brand-primary
                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-text-primary" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image — inset from column edge via row pr-3 */}
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
          </TabsContent>

          <TabsContent value="people" className="m-0 mt-0 outline-none">
            <div className="pt-2 pb-6">
              {peopleCount === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-text-disabled">No people match this search yet.</p>
                </div>
              ) : (
                people.map((person) => {
                  const avatarSrc = getStorageAssetUrl(person.avatarUrl ?? null);
                  const meta = [
                    person.nationality?.trim() || null,
                    person.creditCount != null ? `${person.creditCount} credits` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Link
                      to={`/person/${person.slug}`}
                      key={person.id}
                      className="group flex items-center gap-3 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/40 transition-colors"
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-sm object-cover border border-border-default"
                          loading="lazy"
                        />
                      ) : (
                        <UserRound className="h-4 w-4 text-text-disabled shrink-0" strokeWidth={1.5} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight text-text-primary group-hover:opacity-70 transition-opacity truncate">
                          {person.name}
                        </p>
                        {meta ? (
                          <p className="text-xs text-text-disabled mt-0.5 truncate">{meta}</p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="companies" className="m-0 mt-0 outline-none">
            <div className="pt-2 pb-6">
              {companiesCount === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-text-disabled">No companies match this search yet.</p>
                </div>
              ) : (
                companies.map((company) => {
                  const logoSrc = getStorageAssetUrl(company.logoUrl);
                  const meta = [company.country?.trim() || null, `${company.creditCount} credits`]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Link
                      to={`/company/${company.slug}`}
                      key={company.id}
                      className="group flex items-center gap-3 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-muted/40 transition-colors"
                    >
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-sm object-cover border border-border-default"
                          loading="lazy"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-text-disabled shrink-0" strokeWidth={1.5} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight text-text-primary group-hover:opacity-70 transition-opacity truncate">
                          {company.name}
                        </p>
                        {meta ? (
                          <p className="text-xs text-text-disabled mt-0.5 truncate">{meta}</p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}