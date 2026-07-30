/**
 * CollectionSearchSuggestions.tsx
 *
 * The rail's answer to a collection search that matched nothing: the same query,
 * run against the rest of the database, offered as buildings the editor can add.
 *
 * Shown only to people who can actually edit the collection, and only under the
 * "No matches" empty state — so it reads as a continuation of the search, never
 * as collection content. The heading says so in as many words, because a row
 * here looks like a row up there.
 *
 * When Plano has nothing either, the only way forward is to create the building,
 * which is the existing `/add-building` round trip: it returns to this collection
 * and adds the new building on arrival.
 */
import { useParams } from "react-router";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoveryList } from "@/features/search";
import { useCollectionSearchSuggestions } from "../hooks/useCollectionSearchSuggestions";
import { AddToCollectionButton } from "./AddToCollectionButton";
import { CreateNewBuildingButton } from "./CreateNewBuildingButton";

interface CollectionSearchSuggestionsProps {
  collectionId: string;
  /** The settled query the collection search found no match for. */
  query: string;
  /** Buildings already in the collection — never suggested back. */
  excludeBuildingIds: Set<string>;
}

export function CollectionSearchSuggestions({
  collectionId,
  query,
  excludeBuildingIds,
}: CollectionSearchSuggestionsProps) {
  const { username, slug } = useParams();
  const { buildings, isLoading, isEmpty, addBuilding, addingId } = useCollectionSearchSuggestions({
    collectionId,
    query,
    enabled: true,
    excludeBuildingIds,
  });

  // The create flow returns to `${returnTo}?addBuildings=1&createdBuilding=…`, so
  // this path must stay free of a query string of its own.
  const returnTo = username && slug ? `/${username}/map/${slug}` : undefined;
  const createButton = <CreateNewBuildingButton searchQuery={query} returnTo={returnTo} />;

  if (isEmpty) {
    return (
      <section className="mt-2 border-t border-border-default" aria-label="Buildings elsewhere in Plano">
        {/* The eyebrow avoids "by name": the database search reads credits too,
            so an architect's name reaching this state means Plano has nothing
            of theirs either. */}
        <EmptyState
          eyebrow="Nothing in Plano either"
          message={`No building in Plano matches “${query}” either. Add it, and it joins this collection.`}
          action={createButton}
        />
      </section>
    );
  }

  return (
    <section className="mt-2 border-t border-border-default pt-6" aria-label="Buildings elsewhere in Plano">
      <header className="px-1">
        <p className="eyebrow tracking-widest">Not in this collection</p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          Other buildings in Plano matching “{query}”. Add one to bring it in.
        </p>
      </header>

      <DiscoveryList
        buildings={buildings}
        isLoading={isLoading}
        variant="compact"
        imagePosition="left"
        // These rows leave the collection behind; open them in their own tab so
        // the search the editor is in the middle of survives.
        itemTarget="_blank"
        className="p-0 pb-0"
        footer={
          <div className="mt-4 flex flex-col items-center gap-3 border-t border-border-default pt-6">
            <p className="text-sm text-text-secondary">Not the one you meant?</p>
            {createButton}
          </div>
        }
        renderAction={(building) => (
          <AddToCollectionButton
            buildingName={building.name}
            isAdding={addingId === building.id}
            disabled={addingId !== null}
            onAdd={() => addBuilding(building)}
          />
        )}
      />
    </section>
  );
}
