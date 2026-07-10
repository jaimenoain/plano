import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EntityHeroProps {
  /** Public URL of the hero photo, or `null` for the typographic placeholder. */
  heroImageUrl: string | null;
  /** Descriptive alt text for the image. */
  alt: string;
  /** `.photo-placeholder` caption shown when there is no image. */
  placeholderLabel: string;
  /** Identity block overlaid on the band's bottom gradient (see HeroIdentity). */
  overlay?: ReactNode;
  /**
   * Full literal height classes (Tailwind v4 needs the literal at the call
   * site / here). Defaults to the entity-detail band; localities pass their own.
   */
  heightClassName?: string;
}

/**
 * Shared cropped, full-bleed **colour** hero band for entity detail pages — a
 * cinematic band (never taller than the viewport, so the title stays visible on
 * load) with an identity block overlaid on a bottom gradient. Real photo when
 * one exists; otherwise the `.photo-placeholder` utility (never a flat-grey box).
 * Photography carries the colour — no grayscale.
 *
 * Uses `w-full` (not `w-screen`): as a full-width child of the app inset the two
 * render identically, but `w-full` avoids the 100vw-vs-scrollbar horizontal
 * overflow. Renders a single root element so surrounding document flow (e.g. a
 * sticky-tab sentinel) is unaffected.
 */
export function EntityHero({
  heroImageUrl,
  alt,
  placeholderLabel,
  overlay,
  heightClassName = "h-[58vh] max-h-[640px] min-h-[380px]",
}: EntityHeroProps) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-surface-inverse", heightClassName)}>
      {heroImageUrl ? (
        <motion.img
          key={heroImageUrl}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          src={heroImageUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          loading="eager"
        />
      ) : (
        <div className="photo-placeholder absolute inset-0 h-full w-full" data-label={placeholderLabel} aria-hidden />
      )}

      {overlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pb-9 lg:pb-11">
              {overlay}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
