import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBuildingImageUrl } from "@/utils/image";
import { SectionLabel } from "./SectionLabel";

// ---------------------------------------------------------------------------
// LocalityActivityStream — localized discovery feed
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  type: "review" | "photo" | "building_added" | "collection_created";
  username: string;
  avatarUrl: string | null;
  buildingName: string | null;
  buildingUrl: string | null;
  collectionName: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const initials = item.username.slice(0, 2).toUpperCase();

  const label = (() => {
    switch (item.type) {
      case "review":
        return (
          <>
            reviewed{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}
          </>
        );
      case "photo":
        return (
          <>
            added photos to{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}
          </>
        );
      case "building_added":
        return (
          <>
            added{" "}
            {item.buildingUrl ? (
              <Link
                to={item.buildingUrl}
                className="font-medium text-text-primary underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.buildingName}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">
                {item.buildingName}
              </span>
            )}{" "}
            to the catalogue
          </>
        );
      case "collection_created":
        return (
          <>
            created{" "}
            <span className="font-medium text-text-primary">
              &ldquo;{item.collectionName}&rdquo;
            </span>
          </>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="flex items-start gap-3 border-b border-border-default py-3.5 last:border-b-0">
      <Link to={`/profile/${item.username}`} className="shrink-0">
        <Avatar className="h-7 w-7 border border-border-default bg-surface-muted">
          <AvatarImage src={item.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-2xs font-medium text-text-secondary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-text-secondary">
          <Link
            to={`/profile/${item.username}`}
            className="font-medium text-text-primary transition-colors hover:text-text-secondary"
          >
            {item.username}
          </Link>{" "}
          {label}
        </p>
        <p className="mt-0.5 text-2xs text-text-disabled">
          {timeAgo(item.createdAt)}
        </p>
      </div>
      {item.thumbnailUrl ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden bg-surface-muted">
          <img
            src={getBuildingImageUrl(item.thumbnailUrl) ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}

export function LocalityActivityStream({
  items,
  citySlug,
  countryCode,
}: {
  items: ActivityItem[];
  citySlug: string;
  countryCode: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Recent activity</SectionLabel>
        <Link to={`/explore?cc=${countryCode}&city=${citySlug}`} className="cta-link">
          View all
        </Link>
      </div>
      <div>
        {items.map((item) => (
          <ActivityItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
