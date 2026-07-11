import { motion } from "framer-motion";

export interface HeroCredit {
  isOfficial: boolean;
  username: string | null;
}

interface BuildingHeroSectionProps {
  heroImageUrl: string | null;
  alt: string;
  /** Photographer credit for the chip on the band; null hides the chip. */
  heroCredit: HeroCredit | null;
}

/**
 * The building-detail photo band: a clean cropped photograph with a small
 * credit chip — no overlaid identity. The building name, architect and actions
 * live below in `BuildingMasthead`. When there is no photo the band renders
 * nothing at all and the masthead becomes the hero (an empty hatched band
 * would only push the title down for exactly the buildings with nothing to
 * show).
 */
export function BuildingHeroSection({
  heroImageUrl,
  alt,
  heroCredit,
}: BuildingHeroSectionProps) {
  if (!heroImageUrl) return null;

  return (
    <div className="relative w-full">
      <div className="aspect-[16/9] sm:aspect-[21/9] max-h-[68vh] w-full overflow-hidden bg-surface-muted">
        <motion.img
          key={heroImageUrl}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          src={heroImageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          fetchPriority="high"
          loading="eager"
        />
      </div>
      {heroCredit && (
        <span className="absolute left-4 top-4 sm:left-6 sm:top-6 bg-surface-card/90 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-text-primary">
          {heroCredit.isOfficial ? "Official" : "Photo"}
          {heroCredit.username ? ` · ${heroCredit.username}` : ""}
        </span>
      )}
    </div>
  );
}
