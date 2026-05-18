/**
 * DiscoveryCard.tsx — Redesigned with A24 cinematic aesthetic
 *
 * Swipe / scroll: custom pointer axis gating (vertical feed vs horizontal save/hide), not Framer `drag`.
 * Visual layer:
 *
 * Image:
 *   - object-contain → object-cover: fills the frame completely, cinematic
 *   - Blurred bg layer kept but darkened (opacity-30) — subtle depth for portrait photos
 *   - Gradient: taller (h-3/4) and darker (from-black/95 via-black/40) so
 *     large typography always reads against any photo
 *
 * Building info (bottom overlay):
 *   - Tiny uppercase meta line ABOVE the name: "CITY, COUNTRY · ARCHITECT"
 *     (A24's signature small-label-then-giant-title hierarchy)
 *   - Building name: text-4xl sm:text-5xl — film-poster scale
 *   - Save icon integrated into the name row (right side), no separate Button
 *
 * Swipe feedback stamps:
 *   - Rotated bookmark (save) on success-tinted disc + green wash; "HIDE" stamp for skip
 *
 * Rating overlay:
 *   - "Add points? (Optional)" header → tiny tracking-widest uppercase label
 *   - Button boxes → bare numbers at text-5xl, floating on the overlay
 *   - Selected state: text turns brand-primary (#BEFF00), subtle scale — no borders
 *   - "Next building" button → inline text CTA
 *
 * Pagination dots: kept, top-right corner instead of centered
 */
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type RefCallback,
} from "react";
import { DiscoveryBuilding, type CreditSummary } from "@/features/search/components/types";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl, getBuildingLocalityUrl } from "@/utils/url";
import { Bookmark } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";
import { DiscoveryFeedItem } from "../hooks/useDiscoveryFeed";
import { Link } from "react-router";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContactFacepile } from "./ContactFacepile";

interface DiscoveryCardProps {
  building: DiscoveryBuilding | DiscoveryFeedItem;
  onSave?: (e: React.MouseEvent) => void;
  onSwipeSave?: () => void;
  onSwipeHide?: () => void;
  onSkip?: () => void;
  /** Fires on the first drag gesture — used by Explore to collapse the sidebar */
  onInteractionStart?: () => void;
}

export function DiscoveryCard({
  building,
  onSave: _onSave,
  onSwipeSave,
  onSwipeHide,
  onSkip,
  onInteractionStart,
}: DiscoveryCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const prevVisible = useRef(false);

  // Lazy loading setup (hook returns a callback ref, not RefObject)
  const { containerRef: setLazyObserveTarget, isVisible: _isVisible } =
    useIntersectionObserver({
      threshold: 0.1,
    });

  const cardRootRef = useRef<HTMLDivElement | null>(null);
  const setCardRootRef: RefCallback<HTMLDivElement> = useCallback(
    (node) => {
      cardRootRef.current = node;
      setLazyObserveTarget(node);
    },
    [setLazyObserveTarget]
  );

  // View tracking setup
  const { containerRef: viewTrackerRef, isVisible: isViewVisible } =
    useIntersectionObserver({ threshold: 0.6 });

  useEffect(() => {
    if (isViewVisible) {
      setHasBeenViewed(true);
    }
    if (prevVisible.current && !isViewVisible) {
      if (hasBeenViewed && !isSaved && onSkip) {
        onSkip();
      }
    }
    prevVisible.current = isViewVisible;
  }, [isViewVisible, hasBeenViewed, isSaved, onSkip]);

  const additionalImages = (building as DiscoveryFeedItem).images || [];
  const mainImageUrl = getBuildingImageUrl(building.main_image_url);

  const galleryImages = useMemo(
    () =>
      [
        mainImageUrl,
        ...additionalImages.map((img) => getBuildingImageUrl(img.storage_path)),
      ].filter((url): url is string => !!url),
    [mainImageUrl, additionalImages]
  );

  const uniqueImages = useMemo(
    () => Array.from(new Set(galleryImages)),
    [galleryImages]
  );

  const currentImageOwner = useMemo(() => {
    const currentUrl = uniqueImages[currentImageIndex];
    if (!currentUrl || !additionalImages.length) return null;
    const matchingImage = additionalImages.find(
      (img) => getBuildingImageUrl(img.storage_path) === currentUrl
    );
    if (matchingImage?.building_posts?.user) {
      const userData = matchingImage.building_posts.user;
      return Array.isArray(userData) ? userData[0] : userData;
    }
    return null;
  }, [uniqueImages, currentImageIndex, additionalImages]);

  const creditNames = building.credits
    ?.map((a: CreditSummary | string) => (typeof a === "string" ? a : a.name))
    .filter(Boolean)
    .join(", ");

  const saveToSupabase = async (
    status: "pending" | "ignored",
    ratingValue?: number | null
  ) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: building.id,
          status,
          ...(ratingValue !== undefined ? { rating: ratingValue } : {}),
        },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
    } catch (_error) {
      toast.error("Failed to save");
    }
  };

  const handleRate = async (value: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setRating(value);
    await saveToSupabase("pending", value);
    setTimeout(() => {
      if (onSwipeSave) onSwipeSave();
    }, 500);
  };

  // ── Framer Motion values ──
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  // Card stays fully opaque in both swipe directions — mirrors save behaviour on hide.
  // Previous: [0, 1, 1, 1, 1] faded the card to black on left swipe, hiding the stamp.
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [1, 1, 1, 1, 1]);
  // Stamps: symmetric — both appear starting at ±20px, fully visible at ±100px (threshold)
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
  const likeOverlayOpacity = useTransform(x, [20, 100], [0, 0.35]);
  const nopeOverlayOpacity = useTransform(x, [-100, -20], [0.35, 0]);

  /**
   * Commit thresholds scale with the card width so a tablet doesn't trip a save/hide
   * on a small horizontal drift during vertical scroll. 18% of width, clamped to a
   * phone-friendly minimum and a tablet-friendly maximum.
   */
  const computeSwipeThresholds = useCallback((widthPx: number) => {
    const offset = Math.max(88, Math.min(180, widthPx * 0.18));
    return { offset, velocity: 480 };
  }, []);

  /**
   * Custom pointer swipe (replaces Framer `drag="x"` + `dragDirectionLock`).
   * Framer's direction lock + `touch-pan-y` fights iPad Safari: vertical feed scroll and
   * horizontal save/hide were misclassified (worse in portrait). We only move `x` after
   * explicit horizontal dominance; vertical dominance yields to the parent scroller.
   */
  const [horizontalSwipeActive, setHorizontalSwipeActive] = useState(false);
  /**
   * Mirror of `horizontalSwipeActive` for the permanently-attached touchmove blocker.
   * State-driven attachment leaves a 1-frame gap on iPad Safari during which native
   * snap scroll can commit before we lock horizontal — using a ref closes that gap.
   */
  const horizontalSwipeActiveRef = useRef(false);
  const blockImageTapRef = useRef(false);
  const swipeSessionRef = useRef<{
    activePointerId: number | null;
    /** undecided → first axis wins for the rest of the pointer */
    axis: "undecided" | "horizontal" | "vertical";
    originX: number;
    originY: number;
    moveSamples: { t: number; x: number }[];
    /** Card width captured at gesture start — feeds the scaled commit thresholds. */
    width: number;
  }>({
    activePointerId: null,
    axis: "undecided",
    originX: 0,
    originY: 0,
    moveSamples: [],
    width: 0,
  });

  const applyElasticPull = useCallback((rawDx: number) => {
    const limit = 200;
    const abs = Math.abs(rawDx);
    if (abs <= limit) return rawDx;
    const over = abs - limit;
    return Math.sign(rawDx) * (limit + over * 0.32);
  }, []);

  const finishHorizontalSwipe = useCallback(
    (el: HTMLElement) => {
      const s = swipeSessionRef.current;
      const pull = x.get();
      let vx = 0;
      const samples = s.moveSamples;
      if (samples.length >= 2) {
        const last = samples[samples.length - 1];
        const first = samples[0];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.04) vx = (last.x - first.x) / dt;
      }

      const { offset: SWIPE_OFFSET_PX, velocity: SWIPE_VELOCITY_PX } =
        computeSwipeThresholds(s.width || el.clientWidth || 375);

      const commitRight =
        pull > SWIPE_OFFSET_PX || vx > SWIPE_VELOCITY_PX;
      const commitLeft =
        pull < -SWIPE_OFFSET_PX || vx < -SWIPE_VELOCITY_PX;

      if (Math.abs(pull) > 12) blockImageTapRef.current = true;

      if (commitRight) {
        if (showRating) {
          if (onSwipeSave) onSwipeSave();
        } else {
          setIsSaved(true);
          setShowRating(true);
          saveToSupabase("pending");
        }
      } else if (commitLeft && onSwipeHide) {
        onSwipeHide();
      } else {
        void animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
      }

      const pid = s.activePointerId;
      if (pid != null && el.hasPointerCapture(pid)) {
        try {
          el.releasePointerCapture(pid);
        } catch {
          /* already released */
        }
      }
      s.activePointerId = null;
      s.axis = "undecided";
      s.moveSamples = [];
      s.width = 0;
      horizontalSwipeActiveRef.current = false;
      setHorizontalSwipeActive(false);
    },
    [
      computeSwipeThresholds,
      onSwipeHide,
      onSwipeSave,
      saveToSupabase,
      showRating,
      x,
    ]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (showRating) return;
      if (e.button !== 0) return;
      if (e.pointerType === "touch" && !e.isPrimary) return;

      const s = swipeSessionRef.current;
      s.activePointerId = e.pointerId;
      s.axis = "undecided";
      s.originX = e.clientX;
      s.originY = e.clientY;
      s.moveSamples = [{ t: e.timeStamp, x: e.clientX }];
      s.width = e.currentTarget.clientWidth;
      blockImageTapRef.current = false;
    },
    [showRating]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = swipeSessionRef.current;
      if (s.activePointerId == null || e.pointerId !== s.activePointerId) return;
      if (showRating) return;

      const dx = e.clientX - s.originX;
      const dy = e.clientY - s.originY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const touch = e.pointerType === "touch";
      // Touch arms widened + horizontal lock made stricter so a tablet user's finger
      // drift during a vertical fling doesn't get misread as a save/hide swipe.
      // Vertical lock made easier (lower ratio) so the feed scroll always wins ties.
      const armH = touch ? 32 : 12;
      const armV = touch ? 18 : 10;
      const hRatio = touch ? 1.7 : 1.2;
      const vRatio = touch ? 1.25 : 1.2;

      if (s.axis === "vertical") return;

      if (s.axis === "undecided") {
        if (absDx < 8 && absDy < 8) return;

        if (absDy >= armV && absDy > absDx * vRatio) {
          s.axis = "vertical";
          return;
        }

        if (absDx >= armH && absDx > absDy * hRatio) {
          s.axis = "horizontal";
          onInteractionStart?.();
          horizontalSwipeActiveRef.current = true;
          setHorizontalSwipeActive(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          s.moveSamples = [{ t: e.timeStamp, x: e.clientX }];
          e.preventDefault();
          x.set(applyElasticPull(dx));
        }
        return;
      }

      e.preventDefault();
      s.moveSamples.push({ t: e.timeStamp, x: e.clientX });
      if (s.moveSamples.length > 8) s.moveSamples.shift();
      x.set(applyElasticPull(dx));
    },
    [
      applyElasticPull,
      onInteractionStart,
      showRating,
      x,
    ]
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = swipeSessionRef.current;
      if (s.activePointerId == null || e.pointerId !== s.activePointerId) return;

      if (s.axis === "horizontal") {
        finishHorizontalSwipe(e.currentTarget);
        return;
      }

      s.activePointerId = null;
      s.axis = "undecided";
      s.moveSamples = [];
      s.width = 0;
      horizontalSwipeActiveRef.current = false;
      setHorizontalSwipeActive(false);
    },
    [finishHorizontalSwipe]
  );

  /**
   * iPad Safari can commit a snap-scroll step in the gap between a state update and
   * the effect that attaches a non-passive `touchmove` blocker. Attach the listener
   * once on mount and read the ref so the block engages on the same frame the axis
   * locks to horizontal.
   */
  useEffect(() => {
    const el = cardRootRef.current;
    if (!el) return;
    const preventTouchScroll = (ev: TouchEvent) => {
      if (horizontalSwipeActiveRef.current && ev.cancelable) {
        ev.preventDefault();
      }
    };
    el.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      el.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  const nextImage = (e: React.MouseEvent) => {
    if (blockImageTapRef.current) {
      e.preventDefault();
      e.stopPropagation();
      blockImageTapRef.current = false;
      return;
    }
    e.stopPropagation();
    if (currentImageIndex < uniqueImages.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    if (blockImageTapRef.current) {
      e.preventDefault();
      e.stopPropagation();
      blockImageTapRef.current = false;
      return;
    }
    e.stopPropagation();
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const facepileInteractions = useMemo(() => {
    const visited =
      building.contact_interactions?.filter((i) => i.status === "visited") ||
      [];
    if (currentImageOwner) {
      const contactInteraction = building.contact_interactions?.find(
        (i) => i.user.id === currentImageOwner.id
      );
      if (contactInteraction) {
        const alreadyInList = visited.find(
          (i) => i.user.id === currentImageOwner.id
        );
        if (!alreadyInList) return [...visited, contactInteraction];
      }
    }
    return visited;
  }, [building.contact_interactions, currentImageOwner]);

  // Meta line: city/country + architect
  const metaLine = [
    building.city && building.country
      ? `${building.city}, ${building.country}`
      : building.city || building.country || null,
    creditNames || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div
      ref={setCardRootRef}
      className={cn(
        "group/card relative w-full h-full overflow-hidden min-w-0 select-none bg-black",
        horizontalSwipeActive ? "touch-none" : "touch-pan-y"
      )}
      style={{ x, rotate, opacity, willChange: "transform" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {/* View tracker */}
      <div
        ref={viewTrackerRef as RefCallback<HTMLDivElement>}
        className="absolute inset-0 pointer-events-none"
      />

      {/* ── Blurred background layer (depth for portrait images) ── */}
      {uniqueImages[currentImageIndex] && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
          style={{
            backgroundImage: `url("${uniqueImages[currentImageIndex]}")`,
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Main image — object-cover: cinematic, fills the frame ── */}
      <div className="absolute inset-0 z-10">
        {uniqueImages.length > 0 ? (
          <img
            src={uniqueImages[currentImageIndex]}
            alt={`${building.name} — view ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <span className="text-xs font-medium uppercase tracking-widest text-white/20">
              No image
            </span>
          </div>
        )}
      </div>

      {/* ── Tap zones for image navigation ── */}
      <div className="absolute inset-0 z-20 flex">
        <div className="w-1/2 h-full" onClick={prevImage} />
        <div className="w-1/2 h-full" onClick={nextImage} />
      </div>

      {/* ── Colour overlays (swipe feedback) ── */}
      <motion.div
        className="absolute inset-0 bg-feedback-success z-[15] pointer-events-none"
        style={{ opacity: likeOverlayOpacity }}
      />
      <motion.div
        className="absolute inset-0 bg-feedback-destructive z-[15] pointer-events-none"
        style={{ opacity: nopeOverlayOpacity }}
      />

      {/* ── Swipe feedback stamps — editorial text, not icon boxes ── */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-1/2 left-6 z-50 pointer-events-none -translate-y-1/2"
      >
        <div
          className="flex items-center justify-center rounded-full bg-feedback-success p-4 shadow-card-elevated"
          style={{ transform: "rotate(-12deg)" }}
        >
          <Bookmark
            className="h-10 w-10 text-white"
            strokeWidth={2}
            aria-hidden
          />
        </div>
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-1/2 right-6 z-50 pointer-events-none -translate-y-1/2"
      >
        <p
          className="text-2xl font-bold tracking-[0.2em] uppercase text-feedback-destructive"
          style={{ transform: "rotate(12deg)" }}
        >
          Hide
        </p>
      </motion.div>

      {/* ── Pagination dots — top right, minimal ── */}
      {uniqueImages.length > 1 && (
        <div className="absolute top-4 right-4 flex flex-col gap-1 z-30 pt-10 md:pt-4">
          {uniqueImages.map((_, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-300 ${
                idx === currentImageIndex
                  ? "h-5 bg-white"
                  : "h-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Bottom gradient — tall and dark for large type ── */}
      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-20 pointer-events-none" />

      {/* ── Info overlay ── */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-24 md:pb-8 z-30 text-white pointer-events-none">

        {/* Contact facepile */}
        {facepileInteractions.length > 0 && (
          <div className="pointer-events-auto mb-3">
            <ContactFacepile interactions={facepileInteractions} />
          </div>
        )}

        {/* Tiny meta line above the title — A24's label-before-title signature */}
        {metaLine && (
          <p className="text-2xs font-medium tracking-[0.18em] uppercase text-white/50 mb-2 leading-none">
            {metaLine}
          </p>
        )}

        {/* Building name — full width, no save icon */}
        <div className="mb-0.5">
          <Link
            to={
              (building as DiscoveryBuilding).locality_country_code && (building as DiscoveryBuilding).locality_city_slug
                ? getBuildingLocalityUrl(
                    (building as DiscoveryBuilding).locality_country_code!,
                    (building as DiscoveryBuilding).locality_city_slug!,
                    building.id,
                    building.slug,
                    (building as { short_id?: number | null }).short_id,
                  )
                : getBuildingUrl(building.id, building.slug, (building as { short_id?: number | null }).short_id)
            }
            className="pointer-events-auto hover:opacity-80 active:opacity-80 transition-opacity block"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-none">
              {building.name}
            </h2>
          </Link>
        </div>
      </div>

      {/* ── Rating overlay — typographic, no button boxes ── */}
      {showRating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-end pb-20 sm:pb-24 bg-black/85"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Label */}
          <p className="text-2xs font-medium tracking-[0.25em] uppercase text-white/30 mb-10">
            Add points (optional)
          </p>

          {/* Rating options — pure type, no boxes */}
          <div className="flex items-end gap-10 sm:gap-14">
            {([null, 1, 2, 3] as const).map((val) => {
              const isSelected = rating === val;
              return (
                <button
                  key={val ?? "save"}
                  onClick={(e) => handleRate(val, e)}
                  className={`flex flex-col items-center gap-2 transition-all duration-200 ${
                    isSelected ? "scale-110" : "hover:scale-105"
                  }`}
                >
                  {/* Number / icon */}
                  {val === null ? (
                    <Bookmark
                      className={`w-10 h-10 transition-colors ${
                        isSelected ? "text-brand-primary" : "text-white/30"
                      }`}
                      strokeWidth={isSelected ? 2 : 1.5}
                    />
                  ) : (
                    <span
                      className={`text-3xl sm:text-5xl font-bold leading-none tabular-nums transition-colors ${
                        isSelected ? "text-brand-primary" : "text-white/30"
                      }`}
                    >
                      {val}
                    </span>
                  )}
                  {/* Label — save option is icon-only; points stay typographic */}
                  <span
                    className={`text-2xs font-medium uppercase tracking-widest transition-colors ${
                      val === null
                        ? "sr-only"
                        : isSelected
                          ? "text-brand-primary"
                          : "text-white/20"
                    }`}
                  >
                    {val === null
                      ? "Save without rating"
                      : `${val} pt${val !== 1 ? "s" : ""}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Skip CTA */}
          <button
            className="mt-12 text-xs font-medium uppercase tracking-[0.15em] text-white/20 hover:text-white/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onSwipeSave) onSwipeSave();
            }}
          >
            Next building →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}