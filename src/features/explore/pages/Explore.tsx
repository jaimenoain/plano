/**
 * Explore — vertical discovery feed (snap scroll + swipe gestures).
 *
 * Layout: While the first-run tutorial is visible, MainLayout shows MobileTopBar +
 * AppTopNav; the feed + tutorial sit below that chrome. After the tutorial is
 * dismissed (or already seen), the horizontal top chrome hides for an immersive
 * panel between the notch safe-area and BottomNav (mobile) or full viewport (md+).
 * Sidebar is closed when the tutorial is not shown so the sheet does not cover the feed.
 */
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  type RefCallback,
} from "react";
import type { CreditRole } from "@/features/credits/types";
import type { UserSearchResult } from "@/features/search/hooks/useUserSearch";
import { Navigate, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDiscoveryFeed } from "@/features/posts/hooks/useDiscoveryFeed";
import { DiscoveryCard } from "@/features/posts/components/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExploreTutorial } from "@/features/search/components/ExploreTutorial";
import { AppLayout } from "@/components/layout/AppLayout";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { extractLocationDetails } from "@/lib/location-utils";
import {
  extractGeocodeViewportBounds,
  isExploreViewportWithinRpcLimits,
  type ExploreViewportBounds,
} from "@/features/explore/exploreLocationFilter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
import { DiscoveryFiltersPanel } from "@/features/search/components/DiscoveryFiltersPanel";

export default function Explore() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  /** `null` until client reads localStorage — shell stays under top chrome until then. */
  const [showTutorial, setShowTutorial] = useState<boolean | null>(null);

  const { setExploreHideTopChrome } = useExploreShell();

  useEffect(() => {
    setShowTutorial(!localStorage.getItem("explore-tutorial-seen"));
  }, []);

  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const closeSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }, [isMobile, setOpen, setOpenMobile]);

  const [locationFilter, setLocationFilter] = useState<{
    localityId: string | null;
    viewportBounds: ExploreViewportBounds | null;
    city: string | null;
    country: string | null;
    countryCode: string | null;
    region: string | null;
    label: string | null;
  }>({
    localityId: null,
    viewportBounds: null,
    city: null,
    country: null,
    countryCode: null,
    region: null,
    label: null,
  });
  const [selectedPeople, setSelectedPeople] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedCreditCompany, setSelectedCreditCompany] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedCreditRoles, setSelectedCreditRoles] = useState<CreditRole[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTypologies, setSelectedTypologies] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [constructionStatuses, setConstructionStatuses] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<UserSearchResult[]>([]);

  const architectIds = useMemo(() => {
    const ids = selectedPeople.map((p) => p.id);
    if (selectedCreditCompany) ids.push(selectedCreditCompany.id);
    return ids.length > 0 ? ids : undefined;
  }, [selectedPeople, selectedCreditCompany]);

  const extraFilterCount = useMemo(() => {
    let n = 0;
    if (selectedPeople.length > 0) n++;
    if (selectedContacts.length > 0) n++;
    if (selectedCategory) n++;
    if (selectedTypologies.length > 0) n++;
    if (selectedAttributes.length > 0) n++;
    if (constructionStatuses.length > 0) n++;
    if (selectedCreditCompany) n++;
    if (selectedCreditRoles.length > 0) n++;
    return n;
  }, [
    selectedPeople.length,
    selectedContacts.length,
    selectedCategory,
    selectedTypologies.length,
    selectedAttributes.length,
    constructionStatuses.length,
    selectedCreditCompany,
    selectedCreditRoles.length,
  ]);

  const [isFilterVisible, setIsFilterVisible] = useState(true);
  /**
   * The filter pill is an invitation shown on the first building only. Once the
   * user swipes onward without engaging it, it stays hidden for the rest of the
   * session — unless a filter is actually applied, which must remain visible so
   * it can be changed or cleared.
   */
  const [filterDismissed, setFilterDismissed] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);

  const hasActiveFilters =
    Boolean(locationFilter.label) || extraFilterCount > 0;

  /** Swiping past the first building without an active filter retires the pill. */
  const dismissFilterOnSwipe = useCallback(() => {
    if (!hasActiveFilters) setFilterDismissed(true);
  }, [hasActiveFilters]);
  const [searchValue, setSearchValue] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (showTutorial === null) {
      setExploreHideTopChrome(false);
      return () => {
        setExploreHideTopChrome(false);
      };
    }
    setExploreHideTopChrome(!showTutorial);
    return () => {
      setExploreHideTopChrome(false);
    };
  }, [showTutorial, setExploreHideTopChrome]);

  useEffect(() => {
    if (showTutorial === false) {
      closeSidebar();
    }
  }, [showTutorial, closeSidebar]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isLocationSheetOpen) return;
      // Defer to an open card rating overlay — the card consumes Escape to advance,
      // so Escape shouldn't also yank the user out of Explore on the same keypress.
      if (
        typeof document !== "undefined" &&
        document.querySelector('[data-explore-overlay="open"]')
      ) {
        return;
      }
      navigate("/", { replace: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, isLocationSheetOpen]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
    isFetching,
  } = useDiscoveryFeed({
      localityId: locationFilter.localityId,
      viewportBounds: locationFilter.viewportBounds,
      city: locationFilter.city,
      country: locationFilter.country,
      countryCode: locationFilter.countryCode,
      region: locationFilter.region,
      categoryId: selectedCategory,
      typologyIds: selectedTypologies.length > 0 ? selectedTypologies : undefined,
      attributeIds: selectedAttributes.length > 0 ? selectedAttributes : undefined,
      architectIds,
      creditRoles:
        selectedCreditRoles.length > 0 ? selectedCreditRoles : undefined,
      contactUserIds:
        selectedContacts.length > 0
          ? selectedContacts.map((c) => c.id)
          : undefined,
      buildingStatuses:
        constructionStatuses.length > 0 ? constructionStatuses : undefined,
    });

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    locationFilter.localityId,
    locationFilter.viewportBounds,
    locationFilter.city,
    locationFilter.country,
    locationFilter.countryCode,
    locationFilter.region,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    architectIds,
    selectedCreditRoles,
    selectedContacts,
    constructionStatuses,
  ]);

  /** Hysteresis avoids flicker when snap/elastic scroll oscillates near the threshold (touch). */
  const FILTER_BAR_SHOW_BELOW_PX = 28;
  const FILTER_BAR_HIDE_ABOVE_PX = 80;

  /**
   * On 120Hz tablets the native scroll fires many more events per gesture than React
   * can reconcile cheaply. Coalesce into rAF so we only re-evaluate visibility once
   * per frame.
   */
  const scrollRafRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const handleScroll = () => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollContainerRef.current;
      if (!el) return;
      const top = el.scrollTop;
      // Scrolling past the first building counts as swiping onward — the pill
      // invitation is over unless a filter is already applied.
      if (top >= FILTER_BAR_HIDE_ABOVE_PX) dismissFilterOnSwipe();
      setIsFilterVisible((prev) => {
        if (top <= FILTER_BAR_SHOW_BELOW_PX) return true;
        if (top >= FILTER_BAR_HIDE_ABOVE_PX) return false;
        return prev;
      });
    });
  };

  const handlePlaceDetails = async (details: google.maps.GeocoderResult) => {
    const { city, country, countryCode } = extractLocationDetails(details);
    let region: string | null = null;
    details.address_components?.forEach((comp) => {
      if (comp.types.includes("administrative_area_level_1")) {
        region = comp.long_name;
      }
    });

    let label = details.formatted_address;
    if (city) label = city;
    else if (region) label = region;
    else if (country) label = country;

    const rawViewport = extractGeocodeViewportBounds(details);
    const viewportWithinLimits =
      rawViewport && isExploreViewportWithinRpcLimits(rawViewport)
        ? rawViewport
        : null;

    let localityId: string | null = null;
    if (city && countryCode) {
      try {
        const { data, error } = await supabase.rpc("resolve_locality_for_explore", {
          p_city: city,
          p_country_code: countryCode,
        });
        if (!error && data != null && typeof data === "string") {
          localityId = data;
        }
      } catch {
        /* RPC unavailable or network — fall back to viewport / text tiers */
      }
    }

    const viewportBounds = localityId ? null : viewportWithinLimits;

    setLocationFilter({
      localityId,
      viewportBounds,
      city,
      country,
      countryCode,
      region,
      label,
    });
    setIsLocationSheetOpen(false);
    setSearchValue("");

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationFilter({
      localityId: null,
      viewportBounds: null,
      city: null,
      country: null,
      countryCode: null,
      region: null,
      label: null,
    });
  };

  const handleResetExploreFilters = useCallback(() => {
    setSelectedPeople([]);
    setSelectedContacts([]);
    setSelectedCategory(null);
    setSelectedTypologies([]);
    setSelectedAttributes([]);
    setConstructionStatuses([]);
    setSelectedCreditCompany(null);
    setSelectedCreditRoles([]);
  }, []);

  const allBuildings = data?.pages.flat() || [];
  const [hiddenBuildingIds, setHiddenBuildingIds] = useState<Set<string>>(
    new Set()
  );
  const buildings = useMemo(
    () => allBuildings.filter((b) => !hiddenBuildingIds.has(b.id)),
    [allBuildings, hiddenBuildingIds]
  );

  // Undo a save/hide: return the card to the feed and clear its user_buildings row.
  const undoBuildingAction = useCallback(
    async (buildingId: string) => {
      setHiddenBuildingIds((prev) => {
        const next = new Set(prev);
        next.delete(buildingId);
        return next;
      });
      if (!user) return;
      try {
        const { error } = await supabase
          .from("user_buildings")
          .delete()
          .eq("user_id", user.id)
          .eq("building_id", buildingId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["discovery_feed"] });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to undo:", error);
      }
    },
    [user, queryClient]
  );

  const handleSkip = async (buildingId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "ignored",
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
    } catch (error) {
      // "Skip" is a passive gesture — it fires when a viewed card scrolls out of
      // frame (see DiscoveryCard), not from an explicit user action — so we don't
      // interrupt scrolling with a toast. The write is best-effort: a failed skip
      // just means the building may resurface in a later session. We still log it so
      // the failure is captured for diagnostics (see ConsoleErrorInterceptor) rather
      // than vanishing silently.
      // eslint-disable-next-line no-console
      console.warn("Failed to persist skip:", error);
    }
  };

  const handleSwipeSave = async (buildingId: string) => {
    if (!user) return;
    // A completed swipe on the first card never crosses the scroll threshold
    // (the next card replaces it at the same offset), so retire the pill here too.
    dismissFilterOnSwipe();
    // Optimistically hide the card so the swipe feels instant; roll back below if the
    // write fails so we never claim success for a building that wasn't actually saved.
    setHiddenBuildingIds((prev) => {
      const next = new Set(prev);
      next.add(buildingId);
      return next;
    });
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "pending",
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
      toast.success("Saved to your list", {
        action: { label: "Undo", onClick: () => undoBuildingAction(buildingId) },
      });
      queryClient.invalidateQueries({ queryKey: ["discovery_feed"] });
    } catch (error) {
      // Persist failed: un-hide the card so the building returns to the feed instead of
      // being silently dropped, and tell the user the save didn't take.
      setHiddenBuildingIds((prev) => {
        const next = new Set(prev);
        next.delete(buildingId);
        return next;
      });
      // eslint-disable-next-line no-console
      console.error("Failed to save building:", error);
      toast.error("Failed to save");
    }
  };

  const handleSwipeHide = async (buildingId: string) => {
    if (!user) return;
    // Same as handleSwipeSave: a swipe on the first card doesn't scroll, so the
    // scroll-threshold dismissal never fires for it.
    dismissFilterOnSwipe();
    // Optimistically hide the card so the swipe feels instant; roll back below if the
    // write fails so a building that wasn't actually hidden isn't lost from the feed.
    setHiddenBuildingIds((prev) => {
      const next = new Set(prev);
      next.add(buildingId);
      return next;
    });
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "ignored",
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
      toast("Building hidden", {
        action: { label: "Undo", onClick: () => undoBuildingAction(buildingId) },
      });
      queryClient.invalidateQueries({ queryKey: ["discovery_feed"] });
    } catch (error) {
      // Persist failed: un-hide the card so the building returns to the feed instead of
      // being silently dropped, and tell the user the action didn't take.
      setHiddenBuildingIds((prev) => {
        const next = new Set(prev);
        next.delete(buildingId);
        return next;
      });
      // eslint-disable-next-line no-console
      console.error("Failed to hide building:", error);
      toast.error("Failed to hide building");
    }
  };

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout isFullScreen>

      {/* ── Tutorial overlay ── */}
      {showTutorial === true && (
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
          "fixed left-0 right-0 z-5 flex min-h-0 flex-col overflow-hidden bg-surface-inverse text-white",
          showTutorial === false
            ? "top-[env(safe-area-inset-top,0px)] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:top-0 md:bottom-0"
            : "top-[calc(3.5rem+env(safe-area-inset-top,0px))] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:top-16 md:bottom-0"
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* ── Location filter — minimal sharp pill, top-center ── */}
          <div
            className={cn(
              "absolute top-4 left-0 right-0 z-50 flex justify-center transition-all duration-300 pointer-events-none",
              isFilterVisible && !filterDismissed
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-10"
            )}
          >
          <div
            className={cn(
              isFilterVisible && !filterDismissed
                ? "pointer-events-auto"
                : "pointer-events-none"
            )}
          >
            <Sheet open={isLocationSheetOpen} onOpenChange={setIsLocationSheetOpen}>
              <button
                type="button"
                onClick={() => setIsLocationSheetOpen(true)}
                className={cn(
                  "inline-flex items-center gap-2 min-h-11 px-3 text-xs font-medium uppercase tracking-widest transition-all sm:px-4",
                  locationFilter.label
                    ? "bg-brand-primary text-brand-primary-foreground"
                    : "bg-surface-inverse/80 backdrop-blur-md text-white/70 border border-white/15 hover:bg-surface-inverse hover:text-white/90"
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
                <span className="max-w-[120px] sm:max-w-[140px] truncate">
                  {locationFilter.label || "World"}
                </span>
                {extraFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-white/20 text-2xs font-semibold tabular-nums">
                    {extraFilterCount}
                  </span>
                )}
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
                    className="ml-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-brand-primary-foreground hover:opacity-60 active:opacity-60 transition-opacity"
                  >
                    <X className="h-3 w-3 shrink-0" />
                  </span>
                )}
              </button>

              <SheetContent
                side="right"
                className="flex h-full w-3/4 flex-col overflow-hidden border-l border-border-default bg-surface-default p-0 text-text-primary sm:w-search-serp sm:max-w-none"
              >
                <SheetHeader className="border-b border-border-default px-4 pb-5 pt-6 text-left shrink-0 md:px-6">
                  <SheetTitle className="text-xs font-medium tracking-widest uppercase text-text-secondary">
                    Explore filters
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-6 px-4 pb-8 pt-4 md:px-6">
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                        Location
                      </p>
                      <DiscoverySearchInput
                        value={searchValue}
                        onSearchChange={setSearchValue}
                        onLocationSelect={() => {}}
                        onPlaceDetails={handlePlaceDetails}
                        placeholder="Search city, region, or country..."
                        className="w-full"
                      />
                    </div>
                    <Separator />
                    <DiscoveryFiltersPanel
                      selectedPeople={selectedPeople}
                      onPeopleChange={setSelectedPeople}
                      selectedCreditCompany={selectedCreditCompany}
                      onCreditCompanyChange={setSelectedCreditCompany}
                      selectedCreditRoles={selectedCreditRoles}
                      onCreditRolesChange={setSelectedCreditRoles}
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                      selectedTypologies={selectedTypologies}
                      onTypologiesChange={setSelectedTypologies}
                      selectedAttributes={selectedAttributes}
                      onAttributesChange={setSelectedAttributes}
                      constructionStatuses={constructionStatuses}
                      onConstructionStatusesChange={setConstructionStatuses}
                      selectedContacts={selectedContacts}
                      onContactsChange={setSelectedContacts}
                      showContactPicker
                      onResetGlobalFilters={handleResetExploreFilters}
                    />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
          </div>

          {/* ── Snap scroll feed ── */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 w-full touch-pan-y overflow-y-scroll overscroll-y-contain overscroll-x-contain snap-y snap-mandatory no-scrollbar"
          >
          {/* Loading */}
          {status === "pending" && (
            <div className="h-full w-full flex items-center justify-center snap-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <EmptyState
              className="h-full w-full snap-center"
              tone="inverse"
              eyebrow="Error"
              message="Failed to load feed."
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  Try again
                </Button>
              }
            />
          )}

          {/* Empty */}
          {status !== "pending" && status !== "error" && buildings.length === 0 && (
            <EmptyState
              className="h-full w-full snap-center"
              tone="inverse"
              eyebrow={locationFilter.label || "No results"}
              message="No buildings found here. Try widening your location filter, or check back later."
            />
          )}

          {/* Cards — full-bleed, cinematic, at every breakpoint. */}
          {buildings.map((building) => (
            <div
              key={building.id}
              className="h-full w-full snap-start snap-always"
              style={{ contain: "layout paint" }}
            >
              <div className="relative h-full w-full">
                <DiscoveryCard
                  building={building}
                  onSwipeSave={() => handleSwipeSave(building.id)}
                  onSwipeHide={() => handleSwipeHide(building.id)}
                  onSkip={() => handleSkip(building.id)}
                  onInteractionStart={() => setIsFilterVisible(false)}
                />
              </div>
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