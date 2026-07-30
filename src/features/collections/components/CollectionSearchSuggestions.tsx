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
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoveryList } from "@/features/search";
import { useCollectionSearchSuggestions } from "../hooks/useCollectionSearchSuggestions";
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
        {/* "by name" is not hedging: the database search reads names, aliases and
            places, never the credits — so an architect's name lands here too. */}
        <EmptyState
          eyebrow="Nothing by that name"
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
          <Button
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={`Add ${building.name} to this collection`}
            disabled={addingId !== null}
            onClick={(event) => {
              event.stopPropagation();
              addBuilding(building);
            }}
          >
            {addingId === building.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        )}
      />
    </section>
  );
}
