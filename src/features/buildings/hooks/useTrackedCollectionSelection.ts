import { useCallback, useState } from "react";
import type { Collection, AddedToCollectionEntry } from "@/features/collections";

/**
 * Wraps CollectionSelector's id-only onChange so callers can also learn
 * *which* collections were newly added — needed to link to them ("Open
 * collection") once the pending selection is actually persisted.
 */
export function useTrackedCollectionSelection() {
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [addedCollections, setAddedCollections] = useState<Collection[]>([]);

  const onCollectionSelectionChange = useCallback((ids: string[], added: Collection[]) => {
    setSelectedCollectionIds(ids);
    setAddedCollections((prev) => {
      const kept = prev.filter((c) => ids.includes(c.id));
      const next = added.filter((c) => !kept.some((k) => k.id === c.id));
      return [...kept, ...next];
    });
  }, []);

  /** Resolves the collections actually persisted this save and clears tracking. */
  const confirmAdditions = useCallback(
    (persistedIds: string[]): AddedToCollectionEntry[] => {
      const confirmed = addedCollections
        .filter((c) => persistedIds.includes(c.id) && c.owner?.username)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, ownerUsername: c.owner!.username }));
      setAddedCollections([]);
      return confirmed;
    },
    [addedCollections],
  );

  const reset = useCallback(() => {
    setSelectedCollectionIds([]);
    setAddedCollections([]);
  }, []);

  return {
    selectedCollectionIds,
    setSelectedCollectionIds,
    onCollectionSelectionChange,
    confirmAdditions,
    resetCollectionSelection: reset,
  };
}
