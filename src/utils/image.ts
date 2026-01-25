import { supabase } from "@/integrations/supabase/client";

/**
 * Transforms a building image path (or URL) into a fully qualified public URL.
 *
 * Since the `main_image_url` column was removed and replaced by a computed column
 * that returns the storage path (e.g., "user_uploads/xyz.jpg"), this helper
 * ensures we correctly display the image by generating the Supabase Storage public URL
 * when necessary.
 *
 * @param path - The image path (from storage) or full URL.
 * @returns The full public URL, or undefined if the path is empty.
 */
export const getBuildingImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;

  // If it's already a full URL (legacy or external), return as is
  if (path.startsWith("http") || path.startsWith("blob:")) {
    return path;
  }

  // Otherwise, assume it's a storage path in the 'review_images' bucket
  const { data } = supabase.storage.from("review_images").getPublicUrl(path);
  return data.publicUrl;
};
