import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface BuildingDetailHeroProps {
  /** Public URL of the building's hero photo, or `null` when none is set. */
  heroImageUrl: string | null;
  /** Descriptive alt text — building name + architect + year + place. */
  alt: string;
  /** Used as the `.photo-placeholder` caption when there is no photo. */
  buildingName: string;
  /** Identity block (badges/title/meta) overlaid on the band's bottom gradient. */
  overlay?: ReactNode;
}

/**
 * Cropped, full-bleed **color** hero band for the building detail page — a
 * cinematic ~58vh band (never taller than the viewport, so the title is always
 * visible on load) with the building identity overlaid on a bottom gradient.
 * Real photo when one exists; otherwise the `.photo-placeholder` utility (never
 * a blank/flat-grey box). Photography carries the colour here — no grayscale.
 *
 * Named `BuildingDetailHero` (not `BuildingHero`) because `BuildingHero.tsx`
 * already exists in this directory and is actively used by
 * `src/features/localities/pages/LocalityPage.tsx` with a different prop
 * contract (`src`/`children`).
 */
export function BuildingDetailHero({ heroImageUrl, alt, buildingName, overlay }: BuildingDetailHeroProps) {
  return (
    <div className="relative w-screen h-[58vh] max-h-[640px] min-h-[380px] overflow-hidden bg-surface-inverse">
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
        <div className="photo-placeholder absolute inset-0 h-full w-full" data-label={buildingName} aria-hidden />
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
