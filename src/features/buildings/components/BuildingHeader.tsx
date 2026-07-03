import { createElement } from "react";
import { Calendar } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PopularityBadge } from "./PopularityBadge";
import { getBuildingUrl } from "@/utils/url";
import type { BuildingCreditWithEntities } from "@/features/credits/types";
import { synthesizeAccess } from "@/utils/accessSynthesis";
import { BuildingAttributes } from "./BuildingAttributes";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";

interface BuildingDetails {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  alt_name?: string | null;
  aliases?: string[] | null;
  tier_rank?: string | null;
  location: unknown; // PostGIS / GeoJSON — parsed via parseLocation
  location_precision?: "exact" | "approximate" | string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  year_completed: number;
  styles: { id: string, name: string }[];
  created_by: string;
  status?: string | null;
  access_level?: "public" | "private" | "restricted" | "commercial" | null;
  access_logistics?: "walk-in" | "booking_required" | "tour_only" | "exterior_only" | null;
  access_cost?: "free" | "paid" | "customers_only" | null;
  access_notes?: string | null;
  typology?: string[] | null;
  materials?: string[] | null;
}

interface BuildingHeaderProps {
  building: BuildingDetails;
  /** Primary-tier credits (active/verified) for header attribution links */
  primaryCredits?: BuildingCreditWithEntities[];
  showEditLink: boolean;
  className?: string;
  isEditing?: boolean;
  nameValue?: string;
  yearValue?: number | string;
  onNameChange?: (val: string) => void;
  onYearChange?: (val: number) => void;
}

export const BuildingHeader = ({
  building,
  primaryCredits = [],
  showEditLink,
  className,
  isEditing,
  nameValue,
  yearValue,
  onNameChange,
  onYearChange
}: BuildingHeaderProps) => {
    const accessSynthesis = building.access_level || building.access_logistics || building.access_cost
      ? synthesizeAccess(building.access_level || null, building.access_logistics || null, building.access_cost || null)
      : null;

    const accessBadgeVariant = ():
      | "default"
      | "success"
      | "warning"
      | "brand" => {
      const level = building.access_level;
      if (level === "public") return "success";
      if (level === "commercial") return "brand";
      if (level === "private" || level === "restricted") return "warning";
      if (accessSynthesis?.variant === "warning") return "warning";
      if (accessSynthesis?.variant === "outline") return "brand";
      return "default";
    };

    return (
        <div className={`${className || ""} group`}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col items-start gap-2 mb-2 w-full min-w-0">
                    <PopularityBadge rank={building.tier_rank} city={building.city} />

                    {isEditing ? (
                        <Input
                            value={nameValue}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            className="text-3xl md:text-4xl font-bold tracking-tight leading-tight h-auto px-3 py-2 w-full max-w-md"
                            placeholder="Official Building Name"
                        />
                    ) : (
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary">
                            {building.name}
                        </h1>
                    )}

                    {building.alt_name && building.alt_name !== building.name && !isEditing && (
                        <p className="text-lg text-text-secondary mt-1">
                            {building.alt_name}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary items-center mt-2">
                {isEditing && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-text-secondary" />
                        <Input
                            type="number"
                            value={yearValue}
                            onChange={(e) => onYearChange?.(parseInt(e.target.value))}
                            className="w-24 max-w-32 h-8 text-sm"
                            placeholder="Year"
                        />
                    </div>
                )}
                {primaryCredits.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <PrimaryCreditsLinks
                          credits={primaryCredits}
                          linkClassName="hover:underline text-brand-primary"
                        />
                    </div>
                )}
            </div>

            {!isEditing && <BuildingAttributes building={building} className="mt-4" />}

            {/* Access Synthesis Display */}
            {(accessSynthesis || building.access_notes) && (
                <div className="flex flex-col gap-2 mt-4">
                    {accessSynthesis && (
                        <div className="flex items-center gap-2">
                            <Badge variant={accessBadgeVariant()} className="flex items-center gap-1.5 w-fit">
                                {createElement(accessSynthesis.icon, {
                                  className: "w-3.5 h-3.5",
                                })}
                                {accessSynthesis.label}
                            </Badge>
                        </div>
                    )}
                    {building.access_notes && (
                        <div className="text-sm text-text-secondary border-l-2 border-brand-primary/20 pl-3 py-0.5 bg-surface-muted/30 rounded-sm">
                            {building.access_notes}
                        </div>
                    )}
                </div>
            )}

            {showEditLink && !isEditing && (
                <div className="mt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                        // Locality URL not available: BuildingDetails does not include locality_country_code/city_slug — requires BuildingHeader props update to include locality fields
                        to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"}
                        className="text-xs text-text-secondary hover:underline"
                    >
                        Edit building information
                    </Link>
                </div>
            )}
        </div>
    );
};
