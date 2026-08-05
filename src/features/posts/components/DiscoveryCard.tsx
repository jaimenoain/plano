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
import { computeRotationDeg, computeStampOpacity } from "../utils/swipeGesture";
import {
  useDiscoveryCardGesture,
  FALLBACK_CARD_WIDTH,
} from "../hooks/useDiscoveryCardGesture";

interface DiscoveryCardProps {
  building: DiscoveryBuilding | DiscoveryFeedItem;
  onSave?: (e: React.MouseEvent) => void;
  onSwipeSave?: () => void;
  onSwipeHide?: () => void;
  /** Fires on the first drag gesture — used by Explore to collapse the sidebar */
  onInteractionStart?: () => void;
  /**
   * True when this card is the one the pager is parked on. Only the active card
   * responds to the keyboard; previously this was inferred from a 60%-visibility
   * observer, which several cards could satisfy at once mid-momentum.
   */
  isActive?: boolean;
  /**
   * Vertical drag forwarded to the feed pager. The card owns pointer capture and
   * axis gating, but the feed owns navigation — so once the axis locks vertical the
   * card just relays the finger delta (px, negative = pulling the next card up).
   */
  onVerticalDrag?: (dy: number) => void;
  onVerticalRelease?: (dy: number, vy: number) => void;
  /**
   * The decision already recorded for this building. Swiped cards used to be spliced
   * out of the feed, which shifted every card below them; they now stay in place and
   * wear this badge instead, so the feed's geometry never changes under a gesture.
   */
  resolvedAs?: "saved" | "hidden" | null;
}

export function DiscoveryCard({
  building,
  onSave: _onSave,
  onSwipeSave,
  onSwipeHide,
  onInteractionStart,
  isActive = true,
  onVerticalDrag,
  onVerticalRelease,
  resolvedAs = null,
}: DiscoveryCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // "Seen" is no longer inferred from visibility. A 60%-threshold observer fired for
  // every card a momentum flick crossed, and each one was written as `ignored` —
  // permanently removing buildings the user never looked at. The feed pager now tells
  // Explore which single card was left behind (see useVerticalPager).

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

  /** Explore's record wins; `isSaved` covers the frame before the parent hears back. */
  const decision = resolvedAs ?? (isSaved ? "saved" : null);

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

  /**
   * Advance after the save is settled. The card no longer animates itself off-screen:
   * the feed pager owns navigation now, so sliding here as well would mean two
   * competing motions for one gesture. We just dismiss the rating overlay and let the
   * pager glide to the next building.
   */
  const finishSave = useCallback(() => {
    if (!mountedRef.current) return;
    setShowRating(false);
    y.set(0);
    onSwipeSave?.();
  }, [onSwipeSave, y]);

  // After 5s with no rating, advance anyway (keeping the save).
  useEffect(() => {
    if (!showRating || rating !== null) return;
    const timer = setTimeout(finishSave, 5000);
    return () => clearTimeout(timer);
  }, [showRating, rating, finishSave]);

  const handleRate = async (value: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setRating(value);
    await saveToSupabase("pending", value);
    setTimeout(finishSave, 500);
  };

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
      }).then(() => {
        onSwipeHide();
        // The card stays mounted (the pager just moves past it), so bring it back to
        // rest — otherwise it would still be parked off-frame if the user pages back.
        x.set(0);
      });
    },
    [onSwipeHide, prefersReducedMotion, x]
  );

  const { onPointerDown, onPointerMove, onPointerEnd, blockImageTapRef } =
    useDiscoveryCardGesture({
      x,
      cardWidthRef,
      prefersReducedMotion,
      disabled: showRating,
      onInteractionStart,
      onCommitSave: triggerSave,
      onCommitHide: onSwipeHide ? triggerHide : undefined,
      onVerticalDrag,
      onVerticalRelease,
      rootRef: cardRootRef,
    });

  /**
   * Keyboard control for the active card — the accessible/desktop equivalent of the
   * swipe, since keyboard/AT users can't drag. The pager guarantees exactly one active
   * card, so only it responds. ArrowRight/S → save, ArrowLeft/H → hide,
   * Escape → dismiss the rating overlay (advancing, not navigating away). Typing in a
   * form field is ignored.
   */
  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, showRating, onSwipeSave, triggerSave, triggerHide]);

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
        // `touch-none` unconditionally: the feed is a controlled pager now, so there
        // is no native scroll to hand the vertical axis over to. Letting the browser
        // keep `pan-y` is what allowed a flick's momentum to run past several cards.
        "group/card relative w-full h-full overflow-hidden min-w-0 select-none bg-surface-inverse overscroll-none touch-none",
        hasFinePointer && "cursor-grab active:cursor-grabbing"
      )}
      style={{ x, y, rotate, willChange: "transform" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
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

      {/* ── Decision badge — the card stays put once saved/hidden, and says so ── */}
      {decision && !showRating && (
        <div className="absolute top-4 left-4 z-40 pt-10 md:pt-4">
          <span className="bg-white/10 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-widest text-white backdrop-blur-sm">
            {decision === "saved" ? "Saved" : "Hidden"}
          </span>
        </div>
      )}

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