/**
 * Explore — vertical discovery feed (snap scroll + swipe gestures).
 *
 * Layout: The immersive panel is `fixed` between app chrome — MobileTopBar +
 * BottomNav on small screens, AppTopNav on md+ — so imagery and controls sit
 * in the visible viewport rather than under the shell. Mobile uses the
 * shell’s `SidebarTrigger` (MobileTopBar); no duplicate menu control here.
 * Sidebar state is still closed on entry when the tutorial is dismissed so the
 * sheet does not cover the first paint.
 */
import { useState, useEffect, useMemo, useRef, useCallback, type RefCallback } from "react";
import { Navigate } from "react-router";
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
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";

export default function Explore() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const closeSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }, [isMobile, setOpen, setOpenMobile]);

  const [locationFilter, setLocationFilter] = useState<{
    city: string | null;
    country: string | null;
    region: string | null;
    label: string | null;
  }>({ city: null, country: null, region: null, label: null });
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("explore-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      // Sidebar hides when the user clicks "Begin exploring" in the tutorial
    } else {
      // No tutorial — hide sidebar immediately on page load
      closeSidebar();
    }
  }, [closeSidebar]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useDiscoveryFeed({
      city: locationFilter.city,
      country: locationFilter.country,
      region: locationFilter.region,
    });

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsFilterVisible(scrollContainerRef.current.scrollTop <= 50);
    }
  };

  const handlePlaceDetails = (details: google.maps.GeocoderResult) => {
    let city: string | null = null;
    let country: string | null = null;
    let region: string | null = null;
    let label = details.formatted_address;

    details.address_components.forEach((comp) => {
      if (comp.types.includes("locality")) city = comp.long_name;
      if (comp.types.includes("country")) country = comp.long_name;
      if (comp.types.includes("administrative_area_level_1"))
        region = comp.long_name;
    });

    if (city) label = city;
    else if (region) label = region;
    else if (country) label = country;

    setLocationFilter({ city, country, region, label });
    setIsLocationSheetOpen(false);
    setSearchValue("");

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationFilter({ city: null, country: null, region: null, label: null });
  };

  const allBuildings = data?.pages.flat() || [];
  const [hiddenBuildingIds, setHiddenBuildingIds] = useState<Set<string>>(
    new Set()
  );
  const buildings = useMemo(
    () => allBuildings.filter((b) => !hiddenBuildingIds.has(b.id)),
    [allBuildings, hiddenBuildingIds]
  );

  const handleSkip = async (buildingId: string) => {
    try {
      if (!user) return;
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "ignored",
          edited_at: new Date().toISOString(),
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
    } catch (_error) {}
  };

  const handleSwipeSave = async (buildingId: string) => {
    setHiddenBuildingIds((prev) => {
      const next = new Set(prev);
      next.add(buildingId);
      return next;
    });
    toast.success("Saved to your list");
    try {
      if (!user) return;
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "pending",
          edited_at: new Date().toISOString(),
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["discovery_feed"] });
    } catch (_error) {
      toast.error("Failed to save");
    }
  };

  const handleSwipeHide = async (buildingId: string) => {
    setHiddenBuildingIds((prev) => {
      const next = new Set(prev);
      next.add(buildingId);
      return next;
    });
    try {
      if (!user) return;
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "ignored",
          edited_at: new Date().toISOString(),
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["discovery_feed"] });
    } catch (_error) {
      toast.error("Failed to hide building");
    }
  };

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout isFullScreen>

      {/* ── Tutorial overlay ── */}
      {showTutorial && (
        <ExploreTutorial
          onComplete={() => {
            setShowTutorial(false);
            closeSidebar();
          }}
        />
      )}

      {/* Immersive panel: viewport between fixed app nav (top) and tab bar (bottom, mobile). */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[5] flex min-h-0 flex-col overflow-hidden bg-[#0A0A0A] text-white",
          "top-[calc(3.5rem+env(safe-area-inset-top,0px))] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
          "md:top-16 md:bottom-0"
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* ── Location filter — minimal sharp pill, top-center ── */}
          <div
            className={cn(
              "absolute top-4 left-0 right-0 z-50 flex justify-center transition-all duration-300 pointer-events-none",
              isFilterVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-10"
            )}
          >
          <div className="pointer-events-auto">
            <Sheet open={isLocationSheetOpen} onOpenChange={setIsLocationSheetOpen}>
              <button
                type="button"
                onClick={() => setIsLocationSheetOpen(true)}
                className={cn(
                  "inline-flex items-center gap-2 h-9 px-4 text-xs font-medium uppercase tracking-widest transition-all",
                  locationFilter.label
                    ? "bg-brand-primary text-brand-primary-foreground"
                    : "bg-black/70 backdrop-blur-md text-white/70 border border-white/15 hover:bg-black/90 hover:text-white/90"
                )}
              >
                <MapPin
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    locationFilter.label
                      ? "text-brand-primary-foreground"
                      : "text-white/50"
                  )}
                  strokeWidth={1.5}
                />
                <span className="max-w-[160px] truncate">
                  {locationFilter.label || "World"}
                </span>
                {locationFilter.label && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear location filter"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearFilter(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        clearFilter(e as unknown as React.MouseEvent);
                      }
                    }}
                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center text-brand-primary-foreground hover:opacity-60 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              <SheetContent
                side="right"
                className="flex h-full w-3/4 flex-col overflow-visible border-l border-border-default bg-surface-default p-0 text-text-primary sm:w-search-serp sm:max-w-none"
              >
                <SheetHeader className="border-b border-border-default px-6 pb-5 pt-6 text-left">
                  <SheetTitle className="text-xs font-medium tracking-[0.2em] uppercase text-text-secondary">
                    Filter by location
                  </SheetTitle>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-visible px-6 pb-6 pt-4">
                  <DiscoverySearchInput
                    value={searchValue}
                    onSearchChange={setSearchValue}
                    onLocationSelect={() => {}}
                    onPlaceDetails={handlePlaceDetails}
                    placeholder="Search city, region, or country..."
                    className="w-full"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          </div>

          {/* ── Snap scroll feed ── */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
          >
          {/* Loading */}
          {status === "pending" && (
            <div className="h-full w-full flex items-center justify-center snap-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="h-full w-full flex flex-col items-center justify-center snap-center gap-3">
              <p className="text-2xs font-medium uppercase tracking-widest text-white/20">
                Error
              </p>
              <p className="text-base font-semibold text-white/60">
                Failed to load feed
              </p>
            </div>
          )}

          {/* Empty */}
          {status !== "pending" && status !== "error" && buildings.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center snap-center text-center px-8 gap-4">
              <p className="text-2xs font-medium tracking-[0.2em] uppercase text-white/20 mb-1">
                {locationFilter.label || "No results"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-white/60 leading-tight">
                No buildings found
              </p>
              <p className="text-sm text-white/30 max-w-xs leading-relaxed">
                Try widening your location filter or check back later.
              </p>
            </div>
          )}

          {/* Cards */}
          {buildings.map((building) => (
            <div
              key={building.id}
              className="h-full w-full snap-start snap-always"
            >
              <DiscoveryCard
                building={building}
                onSwipeSave={() => handleSwipeSave(building.id)}
                onSwipeHide={() => handleSwipeHide(building.id)}
                onSkip={() => handleSkip(building.id)}
                onInteractionStart={undefined}
              />
            </div>
          ))}

          {/* Infinite scroll trigger */}
          {(hasNextPage || isFetchingNextPage) && (
            <div
              ref={containerRef as RefCallback<HTMLDivElement>}
              className="h-20 w-full flex justify-center items-center p-4 snap-end"
            >
              {isFetchingNextPage && (
                <Loader2 className="h-4 w-4 animate-spin text-white/20" />
              )}
            </div>
          )}
          </div>
        </div>
      </div>

    </AppLayout>
  );
}