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
 *   - Building name: `.headline` — film-poster scale, matching the kit's `.exp-name`
 *   - Save icon integrated into the name row (right side), no separate Button
 *
 * Swipe feedback stamps:
 *   - Rotated bookmark (save) on success-tinted disc + green wash; "HIDE" stamp for skip
 *
 * Award overlay:
 *   - Tiny tracking-widest uppercase label
 *   - Named award tiers (Impressive / Essential / Masterpiece), each with its own
 *     earned dots, inverted to white for this black stage. Never the bare numerals.
 *   - Selected state: full-opacity dots + subtle scale — no borders, no colour
 *   - "Next building" → a `.cta-link`, whose injected arrow is the only lime here
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
import { Bookmark, X } from "lucide-react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";
import { DiscoveryFeedItem } from "../hooks/useDiscoveryFeed";
import { Link } from "react-router";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { ContactFacepile } from "./ContactFacepile";
import { DiscoveryAwardOverlay } from "./DiscoveryAwardOverlay";
import {
  applyElasticPull,
  computeElasticLimit,
  computeRotationDeg,
  computeStampOpacity,
  computeSwipeThresholds,
  computeVelocity,
  decideAxis,
  resolveSwipeCommit,
  type MoveSample,
} from "../utils/swipeGesture";

/** Fallback card width before the first pointerdown captures a real measurement. */
const FALLBACK_CARD_WIDTH = 375;
/**
 * Lower than the old hard-coded 0.04s so a fast, short flick still registers a
 * velocity instead of springing back and feeling dead (see computeVelocity).
 */
const VELOCITY_DT_GATE = 0.016;

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

  const prefersReducedMotion = useReducedMotion() ?? false;

  // Detect a fine, hovering pointer (mouse/trackpad) — these devices get explicit
  // Save/Hide buttons and a grab cursor since a full-card drag isn't discoverable.
  const [hasFinePointer, setHasFinePointer] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHasFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /** Last measured card width — feeds width-proportional rotation/elastic/stamps. */
  const cardWidthRef = useRef(FALLBACK_CARD_WIDTH);

  // ── Framer Motion values ──
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Rotation, elastic pull and stamp reveal all scale with card width so the gesture
  // feels the same on a phone and on a centered desktop column (see swipeGesture.ts).
  const rotate = useTransform(x, (latest) =>
    prefersReducedMotion ? 0 : computeRotationDeg(latest, cardWidthRef.current)
  );
  const likeOpacity = useTransform(x, (latest) =>
    computeStampOpacity(latest, cardWidthRef.current, "like")
  );
  const nopeOpacity = useTransform(x, (latest) =>
    computeStampOpacity(latest, cardWidthRef.current, "nope")
  );
  const likeOverlayOpacity = useTransform(
    x,
    (latest) => computeStampOpacity(latest, cardWidthRef.current, "like") * 0.35
  );
  const nopeOverlayOpacity = useTransform(
    x,
    (latest) => computeStampOpacity(latest, cardWidthRef.current, "nope") * 0.35
  );

  // Guards the awaited auto-advance callback from firing after the card unmounts
  // (card scrolled away / hidden mid-animation), which could double-save.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // After 5s with no rating, advance (keeping the save). With motion the card
  // slides up first; with reduced motion we skip the slide but still auto-save.
  useEffect(() => {
    if (!showRating || rating !== null) return;
    const timer = setTimeout(async () => {
      if (!prefersReducedMotion) {
        await animate(y, -(typeof window !== "undefined" ? window.innerHeight : 800), {
          duration: 0.55,
          ease: [0.4, 0, 0.6, 1],
        });
      }
      if (mountedRef.current && onSwipeSave) onSwipeSave();
    }, 5000);
    return () => {
      clearTimeout(timer);
      animate(y, 0, { duration: 0 });
    };
  }, [showRating, rating, onSwipeSave, y, prefersReducedMotion]);

  const handleRate = async (value: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setRating(value);
    await saveToSupabase("pending", value);
    setTimeout(() => {
      if (onSwipeSave) onSwipeSave();
    }, 500);
  };

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
    /** timeStamp of pointerdown — seeds the velocity baseline for fast flicks. */
    originT: number;
    moveSamples: MoveSample[];
    /** Card width captured at gesture start — feeds the scaled commit thresholds. */
    width: number;
  }>({
    activePointerId: null,
    axis: "undecided",
    originX: 0,
    originY: 0,
    originT: 0,
    moveSamples: [],
    width: 0,
  });

  /**
   * Shared save/hide commit paths, called by both the swipe gesture and the
   * pointer/keyboard affordances (buttons, arrow keys) so every input route
   * behaves identically.
   */
  const triggerSave = useCallback(() => {
    if (showRating) {
      onSwipeSave?.();
      return;
    }
    setIsSaved(true);
    setShowRating(true);
    saveToSupabase("pending");
    // Snap the card back to centre so it doesn't appear frozen mid-swipe while the
    // rating overlay is visible.
    if (prefersReducedMotion) x.set(0);
    else void animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
  }, [showRating, onSwipeSave, saveToSupabase, prefersReducedMotion, x]);

  const triggerHide = useCallback(
    (el?: HTMLElement | null) => {
      if (!onSwipeHide) return;
      if (prefersReducedMotion) {
        onSwipeHide();
        return;
      }
      const width = el?.clientWidth || cardWidthRef.current || FALLBACK_CARD_WIDTH;
      void animate(x, -width * 1.5, {
        type: "tween",
        duration: 0.22,
        ease: [0.4, 0, 1, 1],
      }).then(() => onSwipeHide());
    },
    [onSwipeHide, prefersReducedMotion, x]
  );

  const finishHorizontalSwipe = useCallback(
    (el: HTMLElement) => {
      const s = swipeSessionRef.current;
      const pull = x.get();
      const width = s.width || el.clientWidth || FALLBACK_CARD_WIDTH;
      const vx = computeVelocity(s.moveSamples, VELOCITY_DT_GATE);
      const commit = resolveSwipeCommit(pull, vx, computeSwipeThresholds(width));

      if (Math.abs(pull) > 12) blockImageTapRef.current = true;

      if (commit === "right") {
        triggerSave();
      } else if (commit === "left" && onSwipeHide) {
        triggerHide(el);
      } else if (prefersReducedMotion) {
        x.set(0);
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
    [onSwipeHide, prefersReducedMotion, triggerHide, triggerSave, x]
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
      s.originT = e.timeStamp;
      s.moveSamples = [{ t: e.timeStamp, x: e.clientX }];
      s.width = e.currentTarget.clientWidth;
      cardWidthRef.current = e.currentTarget.clientWidth || FALLBACK_CARD_WIDTH;
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
      const elasticLimit = computeElasticLimit(s.width || FALLBACK_CARD_WIDTH);

      if (s.axis === "vertical") return;

      if (s.axis === "undecided") {
        const axis = decideAxis({ dx, dy, pointerType: e.pointerType });
        if (axis === "vertical") {
          s.axis = "vertical";
          return;
        }
        if (axis === "horizontal") {
          s.axis = "horizontal";
          onInteractionStart?.();
          horizontalSwipeActiveRef.current = true;
          setHorizontalSwipeActive(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          // Seed the velocity buffer from the gesture origin so a fast, short flick
          // still has two timestamped samples to measure against.
          s.moveSamples = [
            { t: s.originT, x: s.originX },
            { t: e.timeStamp, x: e.clientX },
          ];
          e.preventDefault();
          x.set(applyElasticPull(dx, elasticLimit));
        }
        return;
      }

      e.preventDefault();
      s.moveSamples.push({ t: e.timeStamp, x: e.clientX });
      if (s.moveSamples.length > 8) s.moveSamples.shift();
      x.set(applyElasticPull(dx, elasticLimit));
    },
    [onInteractionStart, showRating, x]
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

  /**
   * Keyboard control for the in-view card — the accessible/desktop equivalent of the
   * swipe, since keyboard/AT users can't drag. Exactly one card is ≥60% visible at a
   * time (isViewVisible), so only it responds. ArrowRight/S → save, ArrowLeft/H → hide,
   * Escape → dismiss the rating overlay (advancing, not navigating away). Typing in a
   * form field is ignored.
   */
  useEffect(() => {
    if (!isViewVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (showRating) {
        if (e.key === "Escape") {
          e.preventDefault();
          onSwipeSave?.();
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        triggerSave();
      } else if (e.key === "ArrowLeft" || e.key === "h" || e.key === "H") {
        e.preventDefault();
        triggerHide(cardRootRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isViewVisible, showRating, onSwipeSave, triggerSave, triggerHide]);

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
      role="group"
      aria-roledescription="Discovery card"
      aria-label={`${building.name}. Press arrow right to save, arrow left to hide.`}
      className={cn(
        "group/card relative w-full h-full overflow-hidden min-w-0 select-none bg-surface-inverse overscroll-x-contain",
        horizontalSwipeActive ? "touch-none" : "touch-pan-y",
        hasFinePointer && "cursor-grab active:cursor-grabbing"
      )}
      style={{ x, y, rotate, willChange: "transform" }}
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

      {/* ── Main image — full-bleed, cropping to fill the frame (object-cover) ── */}
      <div className="absolute inset-0 z-10">
        {uniqueImages.length > 0 ? (
          <img
            src={uniqueImages[currentImageIndex]}
            alt={`${building.name} — view ${currentImageIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-muted">
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
        className="absolute inset-0 bg-feedback-success z-15 pointer-events-none"
        style={{ opacity: likeOverlayOpacity }}
      />
      <motion.div
        className="absolute inset-0 bg-feedback-destructive z-15 pointer-events-none"
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

      {/* ── Save / Hide buttons — mouse & keyboard affordance (fine pointers only) ── */}
      {hasFinePointer && !showRating && (
        <div className="absolute bottom-6 right-5 z-40 flex items-center gap-2">
          <button
            type="button"
            aria-label="Hide building"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerHide(cardRootRef.current);
            }}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-surface-inverse/70 text-white/80 backdrop-blur-md transition-colors hover:bg-feedback-destructive hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Save building"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerSave();
            }}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-surface-inverse/70 text-white/80 backdrop-blur-md transition-colors hover:bg-feedback-success hover:text-white"
          >
            <Bookmark className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {/* ── Bottom gradient — tall and dark for large type ── */}
      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-linear-to-t from-black/95 via-black/40 to-transparent z-20 pointer-events-none" />

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
            className="pointer-events-auto block cursor-pointer hover:opacity-80 active:opacity-80 transition-opacity"
          >
            {/* Kit `.exp-name` — poster scale. `.headline` sets text-primary, so the
                inverse colour is reapplied on top of it. */}
            <h2 className="headline text-white">
              {building.name}
            </h2>
          </Link>
        </div>
      </div>

      {/* ── Award overlay — named tiers, no numerals, no button boxes ── */}
      {showRating && (
        <DiscoveryAwardOverlay
          rating={rating}
          onRate={handleRate}
          onSkip={(e) => {
            e.stopPropagation();
            if (onSwipeSave) onSwipeSave();
          }}
        />
      )}
    </motion.div>
  );
}