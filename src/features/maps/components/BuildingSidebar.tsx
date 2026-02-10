import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMapContext } from '../providers/MapContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBuildingImageUrl } from '@/utils/image';

interface Building {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  rating: number;
  status: string | null;
  lat: number;
  lng: number;
}

interface BuildingSidebarProps {
  topLocation?: { description: string; place_id: string } | null;
  onLocationClick?: (placeId: string) => void;
}

const PAGE_SIZE = 20;

export function BuildingSidebar({ topLocation, onLocationClick }: BuildingSidebarProps = {}) {
  const { state: { bounds, filters }, methods: { setHighlightedId } } = useMapContext();
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['buildings-list', bounds, filters],
    queryFn: async ({ pageParam = 1 }) => {
      // If bounds are not yet available (e.g. initial load), return empty
      if (!bounds) return [];

      // Construct filter criteria matching the RPC expectation
      const filterCriteria = {
        query: filters.query,
        category_id: filters.category,        // Corrected key
        typology_ids: filters.typologies,     // Corrected key
        attribute_ids: filters.attributes,    // Corrected key
        architect_ids: filters.architects?.map((a) => a.id),
        status: filters.status,
        min_rating: filters.minRating,
        rated_by: filters.ratedBy,
        filter_contacts: filters.filterContacts,
        collections: filters.collections?.map((c) => c.id),
        hide_visited: filters.hideVisited,
        hide_saved: filters.hideSaved,
        hide_hidden: filters.hideHidden,
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
          console.error('Error fetching buildings list:', error);
          throw error;
      }

      return data as Building[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than PAGE_SIZE, we've reached the end
      return lastPage && lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    // Only fetch if bounds are valid
    enabled: !!bounds,
    initialPageParam: 1,
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const buildings = data?.pages.flat() || [];

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 p-4">
        {/* Top Location Suggestion */}
        {topLocation && (
          <Card
            className="cursor-pointer overflow-hidden border-transparent bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => onLocationClick?.(topLocation.place_id)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{topLocation.description}</p>
                <p className="text-xs text-muted-foreground">Jump to location</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {!bounds || isLoading ? (
           <div className="flex items-center justify-center p-8">
             {(!bounds || isLoading) && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
           </div>
        ) : isError ? (
           <div className="text-center text-destructive p-4">
             <p>Failed to load buildings.</p>
           </div>
        ) : buildings.length === 0 ? (
           <div className="text-center text-muted-foreground p-4">
             <p>No buildings found in this area.</p>
           </div>
        ) : (
           <>
              {buildings.map((building) => {
                const imageUrl = getBuildingImageUrl(building.image_url);
                return (
                  <Link to={`/building/${building.slug || building.id}`} key={building.id} className="block group">
                    <Card
                      className="overflow-hidden transition-all duration-200 hover:shadow-md border-transparent hover:border-border/50"
                      onMouseEnter={() => setHighlightedId(building.id)}
                      onMouseLeave={() => setHighlightedId(null)}
                    >
                      <div className="relative aspect-video bg-muted">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={building.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                            No Image
                          </div>
                        )}

                        {/* Rating Badge */}
                        {building.rating > 0 && (
                            <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                                {building.rating} <span className="text-yellow-400">★</span>
                            </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-1 text-sm font-semibold leading-tight group-hover:text-primary" title={building.name}>
                                {building.name}
                            </h3>
                        </div>
                        {building.status && building.status !== 'none' && (
                            <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground capitalize">
                                    {building.status}
                                </span>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}

              {/* Infinite Scroll Loader */}
              <div ref={observerTarget} className="flex h-8 w-full items-center justify-center py-2">
                 {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {!hasNextPage && buildings.length > 0 && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                      End of results
                  </div>
              )}
           </>
        )}
      </div>
    </ScrollArea>
  );
}
