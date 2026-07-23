import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/utils/upload";

/**
 * In-tool photo upload for the Embassy Photography tool.
 *
 * Mirrors the image path of `useBuildingInteractions.handleSaveNote` (the
 * building-detail save flow): ensure a `user_buildings` row, ensure a
 * `building_posts` row to key images to, then upload each file via `uploadFile`
 * and insert a `review_images` row. We reuse the *pattern* — not the full
 * building-detail hook, which is coupled to the route loader shape — and keep
 * the Supabase writes here in the feature `api/` module so components stay off
 * the direct client (the `no-restricted-imports` boundary ratchet).
 */

/**
 * The chapter's locality center — used by the Photography tool to auto-position
 * the map when the URL carries no explicit position. Returns null when the
 * chapter has no geocoded locality.
 */
export async function fetchChapterLocalityCenter(
  chapterId: string,
): Promise<{ lat: number; lng: number } | null> {
  const { data, error } = await supabase
    .from("ambassador_chapters")
    .select("localities(lat, lng)")
    .eq("id", chapterId)
    .single();
  if (error) throw error;
  const locality = data?.localities as { lat: number | null; lng: number | null } | null;
  if (!locality?.lat || !locality?.lng) return null;
  return { lat: locality.lat, lng: locality.lng };
}

/** A compressed image awaiting upload (built by the sheet from a file picker). */
export interface PendingUploadImage {
  id: string;
  file: File;
  preview: string;
  width_px: number | null;
  height_px: number | null;
}

/** The `review_images` insert row shape. */
export interface ReviewImageRow {
  review_id: string;
  user_id: string;
  storage_path: string;
  is_generated: boolean;
  width_px: number | null;
  height_px: number | null;
}

/**
 * Pure: build the `review_images` insert row from a storage key + image
 * dimensions + ids. Photography uploads are never AI-generated.
 */
export function buildReviewImageRow(args: {
  reviewId: string;
  userId: string;
  storagePath: string;
  widthPx: number | null;
  heightPx: number | null;
}): ReviewImageRow {
  return {
    review_id: args.reviewId,
    user_id: args.userId,
    storage_path: args.storagePath,
    is_generated: false,
    width_px: args.widthPx,
    height_px: args.heightPx,
  };
}

/**
 * Pure: given the currently-ordered gap queue and the building just completed,
 * return the next building to advance the upload sheet to — or null when the
 * completed one was the last (or isn't in the list). The completed building
 * drops out of the queue on refetch, so its current successor becomes the new
 * top of the list.
 */
export function nextBuildingAfter<T extends { id: string }>(
  buildings: T[],
  completedId: string,
): T | null {
  const idx = buildings.findIndex((b) => b.id === completedId);
  if (idx === -1) return null;
  return buildings[idx + 1] ?? null;
}

/**
 * Upload one or more photos for a building from inside the Photography tool.
 *
 * Ensures the backing rows exist, then uploads + records each image. Uses
 * `.select("id").single()` on the `review_images` insert so a silent RLS
 * rejection (a 201 with an empty body under `return=minimal`) surfaces as a
 * thrown error instead of a phantom success — same guard as the building-detail
 * flow.
 */
export async function uploadBuildingPhotos(args: {
  userId: string;
  buildingId: string;
  images: PendingUploadImage[];
}): Promise<{ uploaded: number }> {
  const { userId, buildingId, images } = args;
  if (images.length === 0) return { uploaded: 0 };

  // 1. Ensure a user_buildings row exists so building_posts has its backing row.
  //    `ignoreDuplicates` = INSERT ... ON CONFLICT DO NOTHING: a fresh row is
  //    marked "visited" (the ambassador photographed it), but an existing row —
  //    with the member's own status/rating — is left untouched.
  const { error: ubError } = await supabase.from("user_buildings").upsert(
    { user_id: userId, building_id: buildingId, status: "visited" },
    { onConflict: "user_id, building_id", ignoreDuplicates: true },
  );
  if (ubError) throw ubError;

  // 2. Create a building_posts row to key the images to.
  const { data: post, error: postError } = await supabase
    .from("building_posts")
    .insert({ user_id: userId, building_id: buildingId, body: "" })
    .select("id")
    .single();
  if (postError) throw postError;
  const postId = post.id;

  // 3. Upload each image and record it.
  for (const img of images) {
    const storagePath = await uploadFile(img.file, postId);
    const { data: inserted, error: imgError } = await supabase
      .from("review_images")
      .insert(
        buildReviewImageRow({
          reviewId: postId,
          userId,
          storagePath,
          widthPx: img.width_px,
          heightPx: img.height_px,
        }),
      )
      .select("id")
      .single();
    if (imgError) throw imgError;
    if (!inserted?.id) {
      throw new Error(
        `Photo insert returned no row — likely RLS/policy rejection. Storage path: ${storagePath}`,
      );
    }
  }

  return { uploaded: images.length };
}
