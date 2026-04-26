import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FeedReview } from "@/types/feed";
import { TrendingBuildings } from "./TrendingBuildings";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";

interface FeedRightRailProps {
  activities: FeedReview[];
}

const sectionLabel = "text-[11px] font-medium tracking-[0.18em] uppercase text-text-disabled mb-3.5";

export function FeedRightRail({ activities }: FeedRightRailProps) {
  return (
    <aside className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto flex-col gap-9 px-8 py-9 [&::-webkit-scrollbar]:hidden">
      {/* Trending this week */}
      <section>
        <TrendingBuildings />
      </section>

      {/* People to follow */}
      <section>
        <p className={sectionLabel}>People to follow</p>
        <PeopleYouMayKnow />
      </section>

      {/* Recent activity */}
      {activities.length > 0 && (
        <section>
          <p className={sectionLabel}>Recent activity</p>
          <div className="flex flex-col">
            {activities.slice(0, 4).map((entry) => {
              const timeAgo = formatDistanceToNow(
                new Date(entry.created_at),
                { addSuffix: true },
              );
              const initial = (entry.user.username || "U")
                .charAt(0)
                .toUpperCase();
              const verb =
                entry.status === "pending" ? "wants to visit" : "visited";
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-3 border-b border-border-default last:border-0"
                >
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={entry.user.avatar_url || ""} />
                    <AvatarFallback className="text-xs font-bold bg-surface-muted text-text-primary">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug">
                      <span className="font-medium text-text-primary">
                        {entry.user.username}
                      </span>{" "}
                      <span className="text-text-disabled">{verb}</span>{" "}
                      <span className="font-medium text-text-primary">
                        {entry.building.name}
                      </span>
                    </p>
                    <p className="text-[11px] text-text-disabled mt-0.5">
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
