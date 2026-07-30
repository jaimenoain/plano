/**
 * collectionItems.ts — data access for writes to a collection's contents
 * (`collection_items` and the notes on `collection_markers`).
 *
 * Kept in an api/ module so the Supabase browser client stays out of hooks and
 * components. RLS is the real gate here: only the owner or an editor contributor
 * may insert, so a viewer who somehow reaches this path gets a database error
 * rather than a silent write.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Append a building to a collection, taking the next free `order_index` so it
 * lands at the end of a manually ordered list (same rule the Add-to-Collection
 * dialog uses).
 */
export async function addBuildingToCollection(
  collectionId: string,
  buildingId: string,
): Promise<void> {
  const { data: maxOrderData, error: maxOrderError } = await supabase
    .from("collection_items")
    .select("order_index")
    .eq("collection_id", collectionId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (maxOrderError) throw maxOrderError;

  const { error } = await supabase.from("collection_items").insert({
    collection_id: collectionId,
    building_id: buildingId,
    order_index: (maxOrderData?.[0]?.order_index ?? -1) + 1,
  });

  if (error) throw error;
}

/** The member's note on one collection entry. */
export async function updateCollectionItemNote(itemId: string, note: string): Promise<void> {
  const { error } = await supabase.from("collection_items").update({ note }).eq("id", itemId);
  if (error) throw error;
}

/** Move an entry into one of the collection's custom categories ("" clears it). */
export async function updateCollectionItemCategory(
  itemId: string,
  categoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("collection_items")
    .update({ custom_category_id: categoryId || null })
    .eq("id", itemId);
  if (error) throw error;
}

/** The note on a non-building marker (hotel, restaurant, transport). */
export async function updateCollectionMarkerNote(markerId: string, notes: string): Promise<void> {
  const { error } = await supabase.from("collection_markers").update({ notes }).eq("id", markerId);
  if (error) throw error;
}
