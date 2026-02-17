import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { PopularityBadge } from "@/components/PopularityBadge";
import { getBuildingUrl } from "@/utils/url";
import { Architect } from "@/types/architect";

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
  access_type?: string | null;
  typology?: string[] | null;
  materials?: string[] | null;
}

interface BuildingHeaderProps {
  building: BuildingDetails;
  showEditLink: boolean;
  className?: string;
}

export const BuildingHeader = ({ building, showEditLink, className }: BuildingHeaderProps) => {
    return (
        <div className={`${className || ""} group`}>
            <div className="flex justify-between items-start">
                <div className="flex flex-col items-start gap-2 mb-2">
                    <PopularityBadge rank={building.tier_rank} city={building.city} />
                    <h1 className="text-4xl font-extrabold tracking-tight">{building.name}</h1>
                    {building.alt_name && building.alt_name !== building.name && (
                        <h2 className="text-xl text-muted-foreground font-medium">{building.alt_name}</h2>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {building.year_completed && (
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{building.year_completed}</span>
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

            {/* Styles Tags */}
            {building.styles && building.styles.length > 0 && (
                <div className="flex gap-2 mt-4">
                    {building.styles.map(style => (
                        <Badge key={style.id} variant="outline" className="border-white/20">{style.name}</Badge>
                    ))}
                </div>
            )}

            {showEditLink && (
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
