import { assembleMosaicItems, type MosaicItem } from "@/features/feed/utils/assembleMosaicItems";
import type { TileSize } from "@/features/feed/utils/assignTileSize";
import type { FeedItem } from "@/types/feedItem";
import { FeedCard } from "./FeedCard";
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

function tileCellClass(tileSize: TileSize): string {
  switch (tileSize) {
    case "xl":
      return "col-span-1 sm:col-span-2 row-span-1 sm:row-span-2 h-[30rem] sm:h-full overflow-hidden";
    case "lg":
      return "col-span-1 sm:col-span-2 h-[22rem] sm:h-full overflow-hidden";
    case "md":
      return "col-span-1 h-[22rem] sm:h-full overflow-hidden";
    case "sm":
      return "col-span-1 h-[16rem] sm:h-full overflow-hidden";
  }
}

function MosaicTile({
  mosaicItem,
  onLike,
  onImageLike,
}: {
  mosaicItem: MosaicItem;
  onLike: (id: string) => void;
  onImageLike: (reviewId: string, imageId: string) => void;
}) {
  const { item, tileSize } = mosaicItem;

  if (item.kind === "prompt") {
    return (
      <div className="col-span-1 sm:col-span-2 lg:col-span-3 overflow-hidden">
        <div className="p-6">
          <PeopleYouMayKnow maxSuggestions={item.payload.maxSuggestions} />
        </div>
      </div>
    );
  }

  if (item.kind === "collection") {
    return (
      <div className={tileCellClass(tileSize)}>
        <WidgetErrorBoundary>
          <FeedCollectionCard collection={item.payload} />
        </WidgetErrorBoundary>
      </div>
    );
  }

  if (item.kind === "building_spotlight") {
    return (
      <div className={tileCellClass(tileSize)}>
        <WidgetErrorBoundary>
          <BuildingSpotlightCard item={item} />
        </WidgetErrorBoundary>
      </div>
    );
  }

  if (item.kind === "editorial") {
    return (
      <div className={tileCellClass(tileSize)}>
        <WidgetErrorBoundary>
          <EditorialCard item={item} />
        </WidgetErrorBoundary>
      </div>
    );
  }

  if (item.kind === "moment_cluster") {
    return (
      <div className={tileCellClass(tileSize)}>
        <WidgetErrorBoundary>
          <MomentClusterCard item={item} />
        </WidgetErrorBoundary>
      </div>
    );
  }

  // kind === "post"
  return (
    <div className={tileCellClass(tileSize)}>
      <FeedCard
        entry={item.payload}
        tileSize={tileSize}
        onLike={onLike}
        onImageLike={onImageLike}
      />
    </div>
  );
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [grid-auto-flow:dense] sm:[grid-auto-rows:22rem] gap-[2px]">
        {mosaicItems.map((mosaicItem) => (
          <MosaicTile
            key={mosaicItem.item.id}
            mosaicItem={mosaicItem}
            onLike={onLike}
            onImageLike={onImageLike}
          />
        ))}
      </div>
    </div>
  );
}
