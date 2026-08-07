import { Link } from "react-router";
import { collectionPath } from "../lib/collectionPath";

export interface AddedToCollectionEntry {
  id: string;
  name: string;
  slug: string;
  ownerUsername: string;
}

interface AddedToCollectionToastProps {
  collections: AddedToCollectionEntry[];
}

/**
 * Confirmation shown after adding a building to one or more collections from
 * a surface other than that collection's own page. Renders one "Open
 * collection" link per collection added.
 */
export function AddedToCollectionToast({ collections }: AddedToCollectionToastProps) {
  if (collections.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {collections.map((collection) => (
        <div key={collection.id} className="flex flex-col">
          <span className="text-text-secondary">{collection.name}</span>
          <Link
            to={collectionPath({ ownerUsername: collection.ownerUsername, slug: collection.slug })}
            className="text-brand-primary underline underline-offset-2 hover:no-underline"
          >
            Open collection
          </Link>
        </div>
      ))}
    </div>
  );
}
