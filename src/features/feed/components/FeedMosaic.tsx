import { assembleMosaicItems, type MosaicItem } from "@/features/feed/utils/assembleMosaicItems";
import type { TileSize } from "@/features/feed/utils/assignTileSize";
import type { FeedItem } from "@/types/feedItem";
import { FeedCard } from "./FeedCard";
import { FeedCollectionCard } from "./FeedCollectionCard";
import { BuildingSpotlightCard } from "./BuildingSpotlightCard";
import { PeopleYouMayKnow } from "./PeopleYouMayKnow";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";

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

export function FeedMosaic({ items, followingCount: _followingCount, onLike, onImageLike }: FeedMosaicProps) {
  const mosaicItems = assembleMosaicItems(items);

  return (
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
  );
}
