import { BuildingDetailHero } from "./BuildingDetailHero";
import { BuildingHeroIdentity } from "./BuildingHeroIdentity";
import type { BuildingDetails } from "../pages/BuildingDetails";

interface BuildingHeroSectionProps {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
  isStatusBuilding: boolean;
  heroImageUrl: string | null;
  alt: string;
}

/**
 * The building-detail hero band with its identity (badges, name, architect,
 * place) overlaid — composed here so the page component stays lean.
 */
export function BuildingHeroSection({
  building,
  buildingCredits,
  isStatusBuilding,
  heroImageUrl,
  alt,
}: BuildingHeroSectionProps) {
  return (
    <BuildingDetailHero
      heroImageUrl={heroImageUrl}
      alt={alt}
      buildingName={building.name}
      overlay={
        <BuildingHeroIdentity
          building={building}
          buildingCredits={buildingCredits}
          isStatusBuilding={isStatusBuilding}
        />
      }
    />
  );
}
