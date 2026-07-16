import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { getBuildingImageUrl } from "@/utils/image";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchBucketList } from "../../api/railApi";
import { RailHeader, RailModule, RailSkeletonRows } from "./RailModule";

/**
 * "Your bucket list" — the member's next buildings to visit: the three most
 * recent pending saves. The rail's contextual widget per the feed redesign
 * brief (§5.4).
 */
export function BucketListModule({ userId }: { userId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "bucket-list", userId],
    queryFn: () => fetchBucketList(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (!userId) return null;

  return (
    <RailModule>
      <RailHeader label="Your bucket list" />
      {isLoading ? (
        <RailSkeletonRows rows={3} withThumb />
      ) : !data || data.length === 0 ? (
        <EmptyState
          className="items-start gap-2 px-0 py-2 text-left"
          eyebrow="Nothing saved yet"
          message="Save buildings you want to visit and they'll queue up here."
          action={
            <Link to="/explore" className="cta-link">
              Explore buildings
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.map((row) => {
              const building = row.building!;
              const href = `/building/${building.id}${building.slug ? `/${building.slug}` : ""}`;
              const imagePath =
                building.hero_image_url ?? building.community_preview_url;
              const image = imagePath ? getBuildingImageUrl(imagePath) : undefined;
              const location = [building.city, building.country]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={row.id}>
                  <Link
                    to={href}
                    className="flex items-center gap-3 transition-opacity hover:opacity-80"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-none bg-surface-muted object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 bg-surface-muted" />
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {building.name}
                      </div>
                      {location && (
                        <div className="mt-0.5 truncate text-xs text-text-disabled">
                          {location}
                          {building.year_completed
                            ? ` · ${building.year_completed}`
                            : ""}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Link to="/profile?section=saved" className="cta-link">
              All saved buildings
            </Link>
          </div>
        </>
      )}
    </RailModule>
  );
}
