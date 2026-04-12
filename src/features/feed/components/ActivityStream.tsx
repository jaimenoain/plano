import { useState } from "react";
import { useNavigate } from "react-router";
import { ActivityLead } from "@/features/feed/components/card-parts/ActivityLead";
import { CardBookmark } from "@/features/feed/components/card-primitives";
import { cn } from "@/lib/utils";
import type { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";

export interface ActivityStreamRowProps {
  entry: FeedReview;
}

/** Legacy alias for `ActivityStreamRow` props; prefer naming new code `FeedActivityRow`. */
export type FeedActivityRowProps = ActivityStreamRowProps;

function buildingThumbSrc(entry: FeedReview): string | undefined {
  const b = entry.building;
  if (!b) return undefined;
  return (
    getBuildingImageUrl(b.main_image_url) ?? getBuildingImageUrl(b.community_preview_url)
  );
}

/**
 * Single activity line: thumbnail, @user verb, building name, bookmark.
 */
export function ActivityStreamRow({ entry }: ActivityStreamRowProps) {
  const navigate = useNavigate();
  const [thumbFailed, setThumbFailed] = useState(false);

  if (!entry.building) return null;

  const username = entry.user?.username?.trim() || "Unknown User";
  const verb = entry.status === "pending" ? "wants to visit" : "visited";
  const thumbUrl = buildingThumbSrc(entry);
  const showPlaceholder = !thumbUrl || thumbFailed;

  const goBuilding = () => {
    navigate(getBuildingUrl(entry.building!.id, entry.building!.slug, entry.building!.short_id));
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    goBuilding();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goBuilding();
        }
      }}
      className={cn("group/activity-row flex cursor-pointer items-center gap-4 py-3")}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-none bg-surface-muted">
        {showPlaceholder ? null : (
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setThumbFailed(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <ActivityLead username={username} verb={verb} className="mb-1" />
        <p className="line-clamp-1 font-sans text-2xl font-black leading-none tracking-tight text-text-primary">
          {entry.building.name}
        </p>
      </div>
      <CardBookmark buildingId={entry.building.id} hoverGroup="activity-row" />
    </div>
  );
}

/** Plan name for activity stream row */
export const FeedActivityRow = ActivityStreamRow;

export interface ActivityStreamGroupProps {
  entries: FeedReview[];
  /** When true, never render the small "Activity" group label (parent supplies section title). */
  hideGroupLabel?: boolean;
}

/**
 * Consecutive activity entries: optional "Activity" label + hairline-separated rows.
 */
export function ActivityStreamGroup({ entries, hideGroupLabel = false }: ActivityStreamGroupProps) {
  if (entries.length === 0) return null;

  const showLabel = !hideGroupLabel && entries.length > 1;

  return (
    <div className="w-full min-w-0">
      {showLabel && (
        <p className="mb-2 font-mono text-[0.5625rem] font-normal uppercase tracking-[0.12em] text-text-secondary">
          Activity
        </p>
      )}
      <div className="divide-y divide-border-default">
        {entries.map((entry) => (
          <ActivityStreamRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
