import type { ReactNode } from "react";
import { EntityHero } from "@/components/media/EntityHero";

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
 * Building-detail hero — the cropped full-colour band with the building identity
 * overlaid. A thin wrapper over the shared {@link EntityHero} primitive
 * (default ~58vh band height); kept as a named component so the building page
 * call-site and its building-specific alt/placeholder contract stay stable.
 */
export function BuildingDetailHero({ heroImageUrl, alt, buildingName, overlay }: BuildingDetailHeroProps) {
  return (
    <EntityHero
      heroImageUrl={heroImageUrl}
      alt={alt}
      placeholderLabel={buildingName}
      overlay={overlay}
    />
  );
}
