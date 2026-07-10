import { motion } from "framer-motion";

interface BuildingDetailHeroProps {
  /** Public URL of the building's hero photo, or `null` when none is set. */
  heroImageUrl: string | null;
  /** Descriptive alt text — building name + architect + year + place. */
  alt: string;
  /** Used as the `.photo-placeholder` caption when there is no photo. */
  buildingName: string;
}

/**
 * Full-bleed 16:9 hero band for the building detail page. Real photo when one
 * exists; otherwise the `.photo-placeholder` utility (never a blank/flat-grey
 * box). Title, badges and meta live in `BuildingHeader` now — this component
 * owns only the image/placeholder band.
 *
 * Named `BuildingDetailHero` (not `BuildingHero`) because `BuildingHero.tsx`
 * already exists in this directory and is actively used by
 * `src/features/localities/pages/LocalityPage.tsx` with a different prop
 * contract (`src`/`children`) — reusing that name/file would have broken it.
 */
export function BuildingDetailHero({ heroImageUrl, alt, buildingName }: BuildingDetailHeroProps) {
  if (!heroImageUrl) {
    return (
      <div
        className="photo-placeholder aspect-16/9 w-screen"
        data-label={buildingName}
        aria-hidden
      />
    );
  }

  return (
    <motion.img
      key={heroImageUrl}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      src={heroImageUrl}
      alt={alt}
      className="aspect-16/9 w-screen object-cover grayscale brightness-75 contrast-90"
      fetchPriority="high"
      loading="eager"
    />
  );
}
