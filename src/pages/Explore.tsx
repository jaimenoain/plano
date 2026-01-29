import { useState, useEffect } from "react";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DiscoveryCard } from "@/components/feed/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Explore() {
  const { profile } = useUserProfile();
  const [filter, setFilter] = useState<'global' | 'local'>('global');

  // Extract city from location if possible.
  // We assume profile.location might be "City, Country" or just "City".
  // The RPC expects a simple string match.
  // If the location is "Paris, France", and DB has "Paris", we might need logic.
  // For now, we pass the raw string.
  const cityFilter = filter === 'local' ? profile?.location || null : null;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useDiscoveryFeed(cityFilter);

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  // Extract flattened list
  const buildings = data?.pages.flat() || [];

  return (
    <div className="relative h-screen w-full bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-center gap-4 pt-12 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
            <Button
                variant={filter === 'global' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full backdrop-blur-md transition-all ${filter === 'global' ? 'bg-white/90 text-black hover:bg-white' : 'text-white hover:bg-white/20'}`}
                onClick={() => setFilter('global')}
            >
                Global
            </Button>
            <Button
                variant={filter === 'local' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full backdrop-blur-md transition-all ${filter === 'local' ? 'bg-white/90 text-black hover:bg-white' : 'text-white hover:bg-white/20'}`}
                onClick={() => setFilter('local')}
                disabled={!profile?.location}
                title={!profile?.location ? "Set location in profile to use" : ""}
            >
                {profile?.location ? "My City" : "My City (N/A)"}
            </Button>
        </div>
      </div>

      {/* Vertical Snap Container */}
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
        {status === 'pending' ? (
            <div className="h-full w-full flex items-center justify-center snap-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        ) : status === 'error' ? (
            <div className="h-full w-full flex items-center justify-center snap-center text-red-400">
                Failed to load feed
            </div>
        ) : buildings.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center snap-center text-gray-400 gap-4">
                <p>No buildings found {filter === 'local' && `in ${profile?.location}`}</p>
                {filter === 'local' && (
                    <Button variant="outline" onClick={() => setFilter('global')}>
                        Browse Global
                    </Button>
                )}
            </div>
        ) : (
            buildings.map((building) => (
                <div key={building.id} className="h-full w-full snap-start">
                    <DiscoveryCard building={building} />
                </div>
            ))
        )}

        {/* Infinite Scroll Trigger */}
        {(hasNextPage || isFetchingNextPage) && (
             <div ref={containerRef as any} className="h-20 w-full flex justify-center items-center p-4 snap-end">
                 {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-white/50" />}
            </div>
        )}
      </div>
    </div>
  );
}
