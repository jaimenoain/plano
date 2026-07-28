/**
 * CollectionRailHeader.tsx
 *
 * The masthead at the top of the collection rail: a four-up cover mosaic when
 * the collection has enough imagery, then the name, owner, description, an
 * optional external link, and the permission-aware action cluster.
 *
 * Extracted from `CollectionMapPage.tsx` unchanged — presentational only, every
 * decision (who may edit, what the actions do) still belongs to the page.
 */
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBuildingImageUrl } from "@/utils/image";
import { CollectionAccessActions } from "./CollectionAccessActions";
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
  onAdd: () => void;
  onOpenSettings: () => void;
}

export function CollectionRailHeader({
  collection,
  ownerUsername,
  coverMosaicUrls,
  canEdit,
  isLoggedIn,
  isFavorite,
  onToggleFavorite,
  onAdd,
  onOpenSettings,
}: CollectionRailHeaderProps) {
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
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">
            {collection.name}
          </h1>
          <div className="text-sm text-text-secondary mb-1">
            By:{" "}
            <Link to={`/profile/${ownerUsername}`} className="hover:underline text-text-primary">
              {ownerUsername}
            </Link>
          </div>
          {collection.description && (
            <p className="text-sm text-text-secondary line-clamp-2">{collection.description}</p>
          )}
          {collection.external_link && (
            <Button variant="outline" size="sm" className="mt-2 h-8" asChild>
              <a href={collection.external_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-2" />
                Visit Link
              </a>
            </Button>
          )}
        </div>
        <CollectionAccessActions
          canEdit={canEdit}
          isLoggedIn={isLoggedIn}
          collectionId={collection.id}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onAdd={onAdd}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </div>
  );
}
