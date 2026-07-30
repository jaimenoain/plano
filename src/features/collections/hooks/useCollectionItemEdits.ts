/**
 * useCollectionItemEdits.ts
 *
 * The three small in-place edits the collection rail makes to its own contents:
 * an entry's note, an entry's custom category, and a marker's note. Each one
 * writes and then asks the page to refetch, so the rail and the map agree.
 *
 * Extracted from `CollectionMapPage.tsx`; the writes live in ../api/collectionItems
 * so the Supabase client stays out of the component tree. A failed write now
 * always says so — the note and category paths used to fail silently.
 */
import { useToast } from "@/components/ui/use-toast";
import {
  updateCollectionItemCategory,
  updateCollectionItemNote,
  updateCollectionMarkerNote,
} from "../api/collectionItems";

interface UseCollectionItemEditsArgs {
  /** Refetch of the combined items + markers query. */
  onChanged: () => void;
}

export function useCollectionItemEdits({ onChanged }: UseCollectionItemEditsArgs) {
  const { toast } = useToast();

  const run = async (write: Promise<void>) => {
    try {
      await write;
      onChanged();
    } catch {
      toast({ title: "Error", description: "Failed to save that change.", variant: "destructive" });
    }
  };

  return {
    handleUpdateNote: (itemId: string, note: string) => run(updateCollectionItemNote(itemId, note)),
    handleUpdateCategory: (itemId: string, categoryId: string) =>
      run(updateCollectionItemCategory(itemId, categoryId)),
    handleUpdateMarkerNote: (markerId: string, note: string) =>
      run(updateCollectionMarkerNote(markerId, note)),
  };
}
