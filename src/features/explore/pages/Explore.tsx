/**
 * Explore — vertical discovery feed (controlled pager + swipe gestures).
 *
 * Navigation: one gesture moves exactly one building. This used to be a native
 * `snap-y snap-mandatory` scroller, but iOS momentum can't be cancelled once released,
 * so a hard flick on iPad carried past three or four cards — and since passing a card
 * wrote `user_buildings.status = 'ignored'`, those buildings were gone for good. The
 * feed no longer scrolls: `useVerticalPager` owns the index (see that file).
 *
 * The feed is also never refetched mid-session. `get_discovery_feed` excludes every
 * building the user has an interaction row for, so invalidating it after a save/hide
 * re-ran all pages and returned entirely different buildings under the user's finger.
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
} from "react";
import type { CreditRole } from "@/features/credits/types";
import type { UserSearchResult } from "@/features/search/hooks/useUserSearch";
import { Navigate, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDiscoveryFeed } from "@/features/posts/hooks/useDiscoveryFeed";
import { DiscoveryCard } from "@/features/posts/components/DiscoveryCard";
import { useVerticalPager } from "../hooks/useVerticalPager";
import { motion } from "framer-motion";
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
  const feedRef = useRef<HTMLDivElement>(null);

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

  const allBuildings = useMemo(() => data?.pages.flat() ?? [], [data]);

  const pager = useVerticalPager({
    count: allBuildings.length,
    containerRef: feedRef,
  });
  const { index: currentIndex, goToNext, reset: resetPager } = pager;

  /**
   * Prefetch by index instead of a bottom sentinel. The old observer only fired once
   * the user had scrolled past the very last card, so the next page started loading
   * exactly when it was already needed.
   */
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (currentIndex >= allBuildings.length - 3) fetchNextPage();
  }, [currentIndex, allBuildings.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    resetPager();
  }, [
    resetPager,
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

  /**
   * The pill is an invitation on the first building only. With a discrete index this
   * is simply "are we still on building one" — no scroll-offset hysteresis needed.
   */
  useEffect(() => {
    if (currentIndex === 0) {
      setIsFilterVisible(true);
      return;
    }
    setIsFilterVisible(false);
    dismissFilterOnSwipe();
  }, [currentIndex, dismissFilterOnSwipe]);

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
    // The filter change also resets the pager via the effect above; this makes the
    // jump immediate rather than waiting for the new query key to settle.
    resetPager();
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

  const buildings = allBuildings;

  /**
   * What the user has already decided about each card in this session. Resolved cards
   * stay *in the list*: removing one used to shorten the feed under the user, which is
   * what produced the flash-then-jump on iPad. The card just renders a confirmation.
   */
  const [resolvedBuildings, setResolvedBuildings] = useState<
    Map<string, "saved" | "hidden">
  >(new Map());

  const markResolved = useCallback(
    (buildingId: string, as: "saved" | "hidden" | null) => {
      setResolvedBuildings((prev) => {
        const next = new Map(prev);
        if (as === null) next.delete(buildingId);
        else next.set(buildingId, as);
        return next;
      });
    },
    []
  );

  // Undo a save/hide: clear the confirmation and the user_buildings row. No feed
  // invalidation — the card never left the list, so there is nothing to restore.
  const undoBuildingAction = useCallback(
    async (buildingId: string) => {
      markResolved(buildingId, null);
      if (!user) return;
      try {
        const { error } = await supabase
          .from("user_buildings")
          .delete()
          .eq("user_id", user.id)
          .eq("building_id", buildingId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["user_buildings"] });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to undo:", error);
      }
    },
    [user, queryClient, markResolved]
  );

  const handleSkip = useCallback(async (buildingId: string) => {
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
      // "Skip" is a passive gesture — it fires when the user pages forward off a
      // building, not from an explicit action — so we don't interrupt them with a
      // toast. The write is best-effort: a failed skip just means the building may
      // resurface in a later session. We still log it so the failure is captured for
      // diagnostics (see ConsoleErrorInterceptor) rather than vanishing silently.
      // eslint-disable-next-line no-console
      console.warn("Failed to persist skip:", error);
    }
  }, [user]);

  /**
   * Mark the building the user just paged *forward* off as seen — exactly one per
   * gesture, and never when paging back. Cards the user explicitly saved or hid
   * already wrote their own row, so they're left alone.
   */
  const prevIndexRef = useRef(0);
  useEffect(() => {
    const prev = prevIndexRef.current;
    prevIndexRef.current = currentIndex;
    if (currentIndex <= prev) return;
    for (let i = prev; i < currentIndex; i++) {
      const left = buildings[i];
      if (left && !resolvedBuildings.has(left.id)) void handleSkip(left.id);
    }
  }, [currentIndex, buildings, resolvedBuildings, handleSkip]);

  const handleSwipeSave = async (buildingId: string) => {
    if (!user) return;
    dismissFilterOnSwipe();
    // Confirm optimistically so the swipe feels instant, then glide to the next
    // building. The card stays in the list, so nothing shifts under the user; roll
    // back below if the write fails so we never claim a save that didn't happen.
    markResolved(buildingId, "saved");
    goToNext();
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
      // Deliberately NOT invalidating ["discovery_feed"]: the RPC excludes every
      // building with a user_buildings row, so refetching mid-session replaces the
      // whole queue with different buildings under the user's finger.
      queryClient.invalidateQueries({ queryKey: ["user_buildings"] });
    } catch (error) {
      // Persist failed: clear the confirmation so the card doesn't claim a save that
      // didn't take.
      markResolved(buildingId, null);
      // eslint-disable-next-line no-console
      console.error("Failed to save building:", error);
      toast.error("Failed to save");
    }
  };

  const handleSwipeHide = async (buildingId: string) => {
    if (!user) return;
    dismissFilterOnSwipe();
    // Same as handleSwipeSave: confirm in place and advance, never mutate the list.
    markResolved(buildingId, "hidden");
    goToNext();
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
      // See handleSwipeSave — the feed query is never invalidated mid-session.
      queryClient.invalidateQueries({ queryKey: ["user_buildings"] });
    } catch (error) {
      // Persist failed: clear the confirmation so the card doesn't claim an action
      // that didn't take.
      markResolved(buildingId, null);
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

          {/* ── Pager feed — one building per gesture, never a native scroll ── */}
          <div
            ref={feedRef}
            className="relative min-h-0 flex-1 w-full overflow-hidden overscroll-none touch-none"
          >
          {/* Loading */}
          {status === "pending" && (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <EmptyState
              className="h-full w-full"
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
              className="h-full w-full"
              tone="inverse"
              eyebrow={locationFilter.label || "No results"}
              message="No buildings found here. Try widening your location filter, or check back later."
            />
          )}

          {/*
            Cards — full-bleed, cinematic, at every breakpoint. Each sits one viewport
            height below the last inside a track we translate ourselves. Only the
            neighbours of the current card are mounted: the pager can never travel
            further than one step, so nothing else can come into view.
          */}
          <motion.div
            className="absolute inset-x-0 top-0 h-full"
            style={{ y: pager.y, willChange: "transform" }}
          >
            {buildings.map((building, i) =>
              Math.abs(i - currentIndex) > 1 ? null : (
                <div
                  key={building.id}
                  className="absolute inset-x-0 h-full"
                  style={{ top: `${i * 100}%` }}
                  // The neighbouring cards are mounted but off-frame. `inert` alongside
                  // `aria-hidden` keeps their buttons and links out of the tab order —
                  // aria-hidden alone on a container with focusable children is a trap.
                  aria-hidden={i !== currentIndex}
                  inert={i !== currentIndex}
                  // Stable identity for the feed's E2E paging assertions — building
                  // names are not unique, so the visible name can't stand in for it.
                  data-building-id={building.id}
                  data-active={i === currentIndex ? "true" : undefined}
                >
                  <DiscoveryCard
                    building={building}
                    isActive={i === currentIndex}
                    resolvedAs={resolvedBuildings.get(building.id) ?? null}
                    onSwipeSave={() => handleSwipeSave(building.id)}
                    onSwipeHide={() => handleSwipeHide(building.id)}
                    onVerticalDrag={pager.onDrag}
                    onVerticalRelease={pager.onRelease}
                    onInteractionStart={() => setIsFilterVisible(false)}
                  />
                </div>
              )
            )}
          </motion.div>

          {/* Next-page spinner — the fetch itself is triggered by the pager index. */}
          {isFetchingNextPage && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-white/20" />
            </div>
          )}
          </div>
        </div>
      </div>

    </AppLayout>
  );
}