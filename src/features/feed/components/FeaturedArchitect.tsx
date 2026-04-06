import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";

interface FeaturedArchitectData {
  id: string;
  name: string;
  type: "individual" | "studio";
  headquarters: string | null;
  bio: string | null;
  isVerified: boolean;
  buildingCount: number;
  previewBuildings: {
    id: string;
    name: string;
    slug: string | null;
    main_image_url: string | null;
  }[];
}

interface ArchitectRow {
  id: string;
  name: string;
  type: "individual" | "studio";
  headquarters: string | null;
  bio: string | null;
}

interface BuildingArchitectRow {
  building:
    | {
        id: string;
        name: string;
        slug: string | null;
        main_image_url: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string | null;
        main_image_url: string | null;
      }[]
    | null;
}

// Pick a deterministic architect each week so it rotates but is stable per session
function getWeeklyIndex(max: number): number {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return weekNumber % max;
}

async function fetchFeaturedArchitect(): Promise<FeaturedArchitectData | null> {
  // Step 1: Fetch a pool of architects
  const { data: architectData, error: architectError } = await supabase
    .from("architects")
    .select("id, name, type, headquarters, bio")
    .limit(40);
  if (architectError) throw architectError;

  const architects = (architectData ?? []) as unknown as ArchitectRow[];
  if (architects.length === 0) return null;

  const featured = architects[getWeeklyIndex(architects.length)];

  // Step 2: Fetch their buildings via junction table
  const { data: buildingData, error: buildingError } = await supabase
    .from("building_architects")
    .select("building:buildings(id, name, slug, main_image_url)")
    .eq("architect_id", featured.id)
    .limit(10);
  if (buildingError) throw buildingError;

  const buildingRows = (buildingData ?? []) as unknown as BuildingArchitectRow[];
  const buildings = buildingRows
    .map((row) => {
      const b = Array.isArray(row.building) ? row.building[0] : row.building;
      return b ?? null;
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Step 3: Check if a verified user profile is linked
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("verified_architect_id", featured.id)
    .maybeSingle();

  return {
    ...featured,
    isVerified: profileData !== null,
    buildingCount: buildings.length,
    previewBuildings: buildings.slice(0, 3),
  };
}

export function FeaturedArchitect() {
  const { data: architect, isLoading } = useQuery({
    queryKey: ["featured-architect-sidebar"],
    queryFn: fetchFeaturedArchitect,
    staleTime: 60 * 60 * 1000, // 1 hour — changes weekly
  });

  if (!isLoading && !architect) return null;

  return (
    <div className="mb-12">
      {/* Header */}
      <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary mb-4">
        Featured architect
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-none" />
            ))}
          </div>
        </div>
      ) : architect ? (
        <div className="space-y-3">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              <span className="text-sm font-bold text-text-secondary select-none">
                {architect.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1 truncate">
                {architect.name}
                {architect.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                )}
              </p>
              {architect.headquarters && (
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {architect.headquarters}
                </p>
              )}
            </div>
          </div>

          {/* Building preview grid */}
          {architect.previewBuildings.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {architect.previewBuildings.map((building) => {
                const imageUrl = getBuildingImageUrl(building.main_image_url);
                return (
                  <Link
                    key={building.id}
                    to={`/building/${building.id}/${building.slug ?? "details"}`}
                    title={building.name}
                    className="aspect-square rounded-none overflow-hidden bg-surface-muted block"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-muted flex items-center justify-center">
                        <span className="text-2xs text-text-disabled text-center px-1 leading-tight">
                          {building.name}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <Link
            to={`/architect/${architect.id}`}
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors inline-flex items-center gap-1.5"
          >
            View profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}