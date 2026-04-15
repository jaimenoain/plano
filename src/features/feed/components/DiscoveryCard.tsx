/**
 * DiscoveryCard.tsx — Redesigned with A24 cinematic aesthetic
 *
 * Visual changes (all logic / hooks / state / gesture handlers unchanged):
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
 *   - Rotated bookmark (save) in brand-primary, "HIDE" typographic stamp for skip
 *
 * Rating overlay:
 *   - "Add points? (Optional)" header → tiny tracking-widest uppercase label
 *   - Button boxes → bare numbers at text-5xl, floating on the overlay
 *   - Selected state: text turns brand-primary (#BEFF00), subtle scale — no borders
 *   - "Next building" button → inline text CTA
 *
 * Pagination dots: kept, top-right corner instead of centered
 */
import { useState, useRef, useEffect, useMemo, type RefCallback } from "react";
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
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
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

  // Lazy loading setup
  const { containerRef, isVisible: _isVisible } = useIntersectionObserver({
    threshold: 0.1,
  });

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
    if (matchingImage?.user_buildings?.user) {
      const userData = matchingImage.user_buildings.user;
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
          edited_at: new Date().toISOString(),
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

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      if (showRating) {
        if (onSwipeSave) onSwipeSave();
      } else {
        setIsSaved(true);
        setShowRating(true);
        saveToSupabase("pending");
      }
    } else if (info.offset.x < -threshold && onSwipeHide) {
      onSwipeHide();
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex < uniqueImages.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
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
      ref={containerRef as RefCallback<HTMLDivElement>}
      className="group/card relative w-full h-full overflow-hidden min-w-0 bg-black snap-start touch-pan-y"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={() => onInteractionStart?.()}
      onDragEnd={handleDragEnd}
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
        className="absolute inset-0 bg-brand-primary z-[15] pointer-events-none"
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
        <Bookmark
          className="h-16 w-16 text-brand-primary"
          strokeWidth={1.75}
          style={{ transform: "rotate(-12deg)" }}
          aria-hidden
        />
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
            className="pointer-events-auto hover:opacity-80 transition-opacity block"
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-none">
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
                      className={`text-5xl font-bold leading-none tabular-nums transition-colors ${
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