import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PopularityBadge } from "@/components/PopularityBadge";
import { getBuildingUrl } from "@/utils/url";
import { Architect } from "@/types/architect";
import { synthesizeAccess } from "@/utils/accessSynthesis";

interface BuildingDetails {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  alt_name?: string | null;
  aliases?: string[] | null;
  tier_rank?: string | null;
  location: any; // PostGIS point handling usually requires parsing
  location_precision?: 'exact' | 'approximate';
  address: string;
  city: string | null;
  country: string | null;
  architects: Architect[];
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

    return (
        <div className={`${className || ""} group`}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col items-start gap-2 mb-2 w-full">
                    <PopularityBadge rank={building.tier_rank} city={building.city} />

                    {isEditing ? (
                        <Input
                            value={nameValue}
                            onChange={(e) => onNameChange?.(e.target.value)}
                            className="text-3xl sm:text-4xl font-extrabold tracking-tight h-auto px-3 py-2 w-full"
                            placeholder="Official Building Name"
                        />
                    ) : (
                        <h1 className="text-4xl font-extrabold tracking-tight">{building.name}</h1>
                    )}

                    {building.alt_name && building.alt_name !== building.name && !isEditing && (
                        <h2 className="text-xl text-muted-foreground font-medium">{building.alt_name}</h2>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground items-center">
                {(building.year_completed || isEditing) && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {isEditing ? (
                             <Input
                                type="number"
                                value={yearValue}
                                onChange={(e) => onYearChange?.(parseInt(e.target.value))}
                                className="w-24 h-8 text-sm"
                                placeholder="Year"
                            />
                        ) : (
                            <span>{building.year_completed}</span>
                        )}
                    </div>
                )}
                {(building.architects && building.architects.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {building.architects.map((arch, i) => (
                            <span key={arch.id}>
                                <Link to={`/architect/${arch.id}`} className="hover:underline text-primary">
                                    {arch.name}
                                </Link>
                                {i < building.architects.length - 1 && ", "}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-sm text-muted-foreground mt-2">
                {[
                    building.typology?.join(", "),
                    building.materials?.join(", ")
                ].filter(Boolean).join(" • ")}
            </div>

            {/* Access Synthesis Display */}
            {(accessSynthesis || building.access_notes) && (
                <div className="flex flex-col gap-2 mt-4">
                    {accessSynthesis && (
                        <div className="flex items-center gap-2">
                            <Badge variant={accessSynthesis.variant} className="flex items-center gap-1.5 w-fit">
                                <accessSynthesis.icon className="w-3.5 h-3.5" />
                                {accessSynthesis.label}
                            </Badge>
                        </div>
                    )}
                    {building.access_notes && (
                        <div className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 py-0.5 bg-muted/30 rounded-r-md">
                            {building.access_notes}
                        </div>
                    )}
                </div>
            )}

            {/* Styles Tags */}
            {building.styles && building.styles.length > 0 && (
                <div className="flex gap-2 mt-4">
                    {building.styles.map(style => (
                        <Badge key={style.id} variant="outline" className="border-white/20">{style.name}</Badge>
                    ))}
                </div>
            )}

            {showEditLink && !isEditing && (
                <div className="mt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                        to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"}
                        className="text-xs text-muted-foreground hover:underline"
                    >
                        Edit building information
                    </Link>
                </div>
            )}
        </div>
    );
};
