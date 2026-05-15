import { assembleMosaicItems } from "@/features/feed/utils/assembleMosaicItems";
import { deriveLegacyFeedUi } from "@/features/feed/utils/deriveLegacyFeedUi";
import type { FeedItem } from "@/types/feedItem";
import { FeedCardA } from "./FeedCardA";
import { FeedCardB } from "./FeedCardB";
import { FeedCardC } from "./FeedCardC";
import { FeedCollectionCard } from "./FeedCollectionCard";
import { BuildingSpotlightCard } from "./BuildingSpotlightCard";
import { EditorialCard } from "./EditorialCard";
import { MomentClusterCard } from "./MomentClusterCard";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { useState } from "react";
import { UsersRound, X } from "lucide-react";
import { Link } from "react-router";

export interface FeedMosaicProps {
  items: FeedItem[];
  followingCount: number;
  onLike: (id: string) => void;
  onImageLike: (reviewId: string, imageId: string) => void;
}

const FOLLOW_NUDGE_THRESHOLD = 5;
const FOLLOW_NUDGE_DISMISSED_KEY = "plano_follow_nudge_dismissed";

function FollowNudgeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border-default">
      <UsersRound className="h-5 w-5 shrink-0 text-text-secondary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary leading-tight">Follow more people</p>
        <p className="text-xs text-text-secondary mt-0.5">Your feed will be more interesting when you follow friends.</p>
      </div>
      <Link
        to="/connect"
        className="shrink-0 px-4 py-1.5 bg-text-primary text-text-inverse text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Find people
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 p-1 text-text-disabled hover:text-text-secondary transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FeedMosaic({ items, followingCount, onLike, onImageLike }: FeedMosaicProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(FOLLOW_NUDGE_DISMISSED_KEY) === "1",
  );
  const mosaicItems = assembleMosaicItems(items);
  const showNudge = !dismissed && followingCount < FOLLOW_NUDGE_THRESHOLD;

  function handleDismiss() {
    localStorage.setItem(FOLLOW_NUDGE_DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div>
      {showNudge && <FollowNudgeBanner onDismiss={handleDismiss} />}
      <div className="divide-y divide-border-default">
        {mosaicItems.map(({ item }) => {
          if (item.kind === "prompt") {
            return (
              <div key={item.id} className="px-5 py-8 md:px-10">
                <PeopleYouMayKnow maxSuggestions={item.payload.maxSuggestions} />
              </div>
            );
          }

          if (item.kind === "post") {
            const entry = item.payload;
            const { layout } = deriveLegacyFeedUi(entry);
            return (
              <div key={item.id} className="px-5 py-10 md:px-8">
                {layout === "compact-stack" || layout === "text-forward" ? (
                  <FeedCardA entry={entry} onLike={onLike} />
                ) : layout === "balanced" ? (
                  <FeedCardB entry={entry} onLike={onLike} onImageLike={onImageLike} />
                ) : (
                  <FeedCardC entry={entry} onLike={onLike} onImageLike={onImageLike} />
                )}
              </div>
            );
          }

          return (
            <div key={item.id} className="h-52 overflow-hidden">
              <WidgetErrorBoundary>
                {item.kind === "collection" && <FeedCollectionCard collection={item.payload} />}
                {item.kind === "building_spotlight" && <BuildingSpotlightCard item={item} />}
                {item.kind === "editorial" && <EditorialCard item={item} />}
                {item.kind === "moment_cluster" && <MomentClusterCard item={item} />}
              </WidgetErrorBoundary>
            </div>
          );
        })}
      </div>
    </div>
  );
}
