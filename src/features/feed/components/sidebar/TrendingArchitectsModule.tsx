import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchTrendingArchitects } from "../../api/railApi";
import {
  RAIL_LIST_ITEM,
  RAIL_ROW,
  RAIL_ROW_FIGURE,
  RAIL_ROW_META,
  RAIL_ROW_TITLE,
  RailHeader,
  RailModule,
  RailSkeletonRows,
} from "./RailModule";

/**
 * "Most credited" — the architects behind the buildings the community has
 * been posting about this week, ranked by distinct buildings credited.
 */
export function TrendingArchitectsModule() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "trending-architects"],
    queryFn: fetchTrendingArchitects,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <RailModule>
      <RailHeader label="Most credited" />
      {isLoading ? (
        <RailSkeletonRows rows={4} />
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-text-secondary">No activity yet this week.</p>
      ) : (
        <ul>
          {data.map((architect, index) => {
            const href = architect.slug ? `/person/${architect.slug}` : null;
            const row = (
              <div className={`${RAIL_ROW} min-w-0 flex-1`}>
                <span className={RAIL_ROW_FIGURE}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={RAIL_ROW_TITLE}>{architect.name}</div>
                  <div className={RAIL_ROW_META}>
                    {architect.building_count}{" "}
                    {architect.building_count === 1 ? "building" : "buildings"}
                  </div>
                </div>
              </div>
            );
            return (
              <li key={architect.id} className={RAIL_LIST_ITEM}>
                {href ? (
                  <Link to={href} className="block transition-opacity hover:opacity-80">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </RailModule>
  );
}
