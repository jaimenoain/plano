import { motion } from "framer-motion";

export interface HeroCredit {
  isOfficial: boolean;
  username: string | null;
}

interface BuildingHeroSectionProps {
  heroImageUrl: string | null;
  alt: string;
  /** Photographer credit for the caption under the band; null hides it. */
  heroCredit: HeroCredit | null;
}

/**
 * The building-detail photo band — deliberately demoted. It sits *below* the
 * masthead (the name leads the page now) and is contained to the content
 * column with a firm height cap, so an un-curated UGC shot is a supporting
 * image rather than a full-bleed hero. Credit is a quiet caption, not an
 * overlaid pill. When there is no photo the band renders nothing at all.
 */
export function BuildingHeroSection({
  heroImageUrl,
  alt,
  heroCredit,
}: BuildingHeroSectionProps) {
  if (!heroImageUrl) return null;

  return (
    <figure className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-10">
      <div className="aspect-[4/3] sm:aspect-[16/9] max-h-[420px] w-full overflow-hidden bg-surface-muted">
        <motion.img
          key={heroImageUrl}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          src={heroImageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          fetchPriority="high"
          loading="eager"
        />
      </div>
      {heroCredit && (
        <figcaption className="mt-2 text-right text-[11px] tracking-[0.05em] text-text-secondary">
          {heroCredit.isOfficial ? "Official" : "Photo"}
          {heroCredit.username ? ` · ${heroCredit.username}` : ""}
        </figcaption>
      )}
    </figure>
  );
}
