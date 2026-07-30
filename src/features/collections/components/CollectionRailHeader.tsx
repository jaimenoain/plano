/**
 * CollectionRailHeader.tsx
 *
 * The masthead at the top of the collection rail: a four-up cover mosaic when
 * the collection has enough imagery, then the title, a byline, the description
 * and the labelled relationship actions.
 *
 * This block scrolls away with the list — it is the collection's introduction,
 * read once. The controls a reader keeps using (add, settings, tabs, search)
 * live in `CollectionRailToolbar`, which stays pinned below it, so the title has
 * the full rail width to itself in every permission state.
 *
 * Design pre-flight
 * - Byline: one line carrying two facts — who made this, and how big it is —
 *   in the editorial `author · count` form. It used to read "By: <name>" and
 *   spend a whole line on a label; the position under a title already says
 *   "by", and the size of a collection is the first thing a reader wants and
 *   was previously only visible mid-search.
 * - Rules: none of its own. The masthead is the introduction, the toolbar below
 *   it closes the chrome with a single hairline; a second rule here boxed the
 *   title in and made the rail read as a stack of panels rather than one column.
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
  /** Entries in the collection — the second half of the byline. */
  entryCount?: number;
  canEdit: boolean;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function CollectionRailHeader({
  collection,
  ownerUsername,
  coverMosaicUrls,
  entryCount,
  canEdit,
  isLoggedIn,
  isFavorite,
  onToggleFavorite,
}: CollectionRailHeaderProps) {
  // Editors get no labelled actions, so the row would otherwise render empty.
  const hasActionRow = !canEdit || !!collection.external_link;

  return (
    <div>
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
      <div className="px-4 pb-2 pt-4">
        <h1 className="wrap-break-word line-clamp-2 pb-[0.15em] text-2xl font-bold leading-tight tracking-tight">
          {collection.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {ownerUsername && (
            <Link to={`/profile/${ownerUsername}`} className="text-text-primary hover:underline">
              {ownerUsername}
            </Link>
          )}
          {ownerUsername && entryCount !== undefined && (
            <span aria-hidden className="px-1.5 text-text-disabled">
              ·
            </span>
          )}
          {entryCount !== undefined && (
            <span>
              {entryCount} {entryCount === 1 ? "entry" : "entries"}
            </span>
          )}
        </p>

        {collection.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">
            {collection.description}
          </p>
        )}

        {hasActionRow && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
