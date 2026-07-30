/**
 * CollectionRailHeader.tsx
 *
 * The masthead at the top of the collection rail: a four-up cover mosaic when
 * the collection has enough imagery, then the name, owner, description and the
 * labelled relationship actions.
 *
 * This block scrolls away with the list — it is the collection's introduction,
 * read once. The controls a reader keeps using (add, settings, tabs, search)
 * live in `CollectionRailToolbar`, which stays pinned above it, so the title now
 * has the full rail width to itself in every permission state.
 *
 * Presentational only; every decision (who may edit, what the actions do) still
 * belongs to the page.
 */
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBuildingImageUrl } from "@/utils/image";
import { CollectionRelationshipActions } from "./CollectionAccessActions";
import type { Collection } from "../types";

interface CollectionRailHeaderProps {
  collection: Collection;
  ownerUsername?: string | null;
  /** Up to four image URLs; the mosaic renders only at a full row of four. */
  coverMosaicUrls: string[];
  canEdit: boolean;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function CollectionRailHeader({
  collection,
  ownerUsername,
  coverMosaicUrls,
  canEdit,
  isLoggedIn,
  isFavorite,
  onToggleFavorite,
}: CollectionRailHeaderProps) {
  // Editors get no labelled actions, so the row would otherwise render empty.
  const hasActionRow = !canEdit || !!collection.external_link;

  return (
    <div className="border-b">
      {coverMosaicUrls.length >= 4 && (
        <div className="grid grid-cols-4 gap-mosaic-gap bg-border-default">
          {coverMosaicUrls.map((url, index) => (
            <div key={index} className="aspect-4/5 overflow-hidden bg-surface-muted">
              <img
                src={getBuildingImageUrl(url) ?? url}
                alt=""
                className="h-full w-full rounded-none object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h1 className="wrap-break-word line-clamp-2 pb-[0.15em] text-2xl font-bold leading-tight tracking-tight">
            {collection.name}
          </h1>
          <p className="text-sm text-text-secondary">
            By:{" "}
            <Link to={`/profile/${ownerUsername}`} className="text-text-primary hover:underline">
              {ownerUsername}
            </Link>
          </p>
        </div>

        {collection.description && (
          <p className="line-clamp-2 text-sm text-text-secondary">{collection.description}</p>
        )}

        {hasActionRow && (
          <div className="flex flex-wrap items-center gap-2">
            <CollectionRelationshipActions
              canEdit={canEdit}
              isLoggedIn={isLoggedIn}
              collectionId={collection.id}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
            {collection.external_link && (
              <Button variant="ghost" size="sm" asChild>
                <a href={collection.external_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Visit link
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
