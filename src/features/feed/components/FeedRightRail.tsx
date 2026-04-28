import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FeedReview } from "@/types/feed";
import { TrendingBuildings } from "./TrendingBuildings";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";

interface FeedRightRailProps {
  activities: FeedReview[];
}

const railLabel = "text-[11px] font-medium tracking-[0.18em] uppercase text-text-disabled mb-4";

export function FeedRightRail({ activities }: FeedRightRailProps) {
  const { statuses } = useUserBuildingStatuses();
  const visits = Object.values(statuses).filter((s) => s === "visited").length;
  const saved = Object.values(statuses).filter((s) => s === "pending").length;

  return (
    <aside className="hidden md:flex flex-col gap-10 px-8 pt-10 pb-8">
      {/* Stats */}
      <section>
        <div className="grid grid-cols-2 border border-border-default divide-x divide-border-default">
          {[
            { label: "Visits", value: visits },
            { label: "Saved", value: saved },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-5 gap-1.5">
              <span className="text-[24px] font-semibold text-text-primary leading-none tracking-[-0.025em]">
                {value}
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-disabled">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Trending this week */}
      <section>
        <TrendingBuildings />
      </section>

      {/* People you may know */}
      <section>
        <p className={railLabel}>People you may know</p>
        <PeopleYouMayKnow showHeading={false} maxSuggestions={3} />
      </section>

      {/* Recent activity */}
      {activities.length > 0 && (
        <section>
          <p className={railLabel}>Recent activity</p>
          <div className="flex flex-col">
            {activities.slice(0, 6).map((entry) => {
              const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });
              const initial = (entry.user.username || "U").charAt(0).toUpperCase();
              const verb = entry.status === "pending" ? "wants to visit" : "visited";
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-3.5 border-b border-border-default last:border-0"
                >
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5 rounded-none">
                    <AvatarImage src={entry.user.avatar_url || ""} />
                    <AvatarFallback className="text-[10px] font-semibold bg-text-primary text-white rounded-none">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-text-secondary">
                      <span className="font-medium text-text-primary">{entry.user.username}</span>
                      {" "}
                      <span className="text-text-disabled">{verb}</span>
                      {" "}
                      <span className="font-medium text-text-primary">{entry.building.name}</span>
                    </p>
                    <p className="font-mono text-[11px] text-text-disabled mt-1 tracking-[0.04em]">
                      {timeAgo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </aside>
  );
}
