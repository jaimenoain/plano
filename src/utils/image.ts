import { config } from '@/config';

/**
 * Transforms a building image path (or URL) into a fully qualified public URL.
 *
 * Since the `main_image_url` column was removed and replaced by a computed column
 * that returns the storage path (e.g., "user_uploads/xyz.jpg"), this helper
 * ensures we correctly display the image by generating the full public URL.
 *
 * @param path - The image path (from storage) or full URL.
 * @returns The full public URL, or undefined if the path is empty.
 */
export const getBuildingImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;

  // If it's already a full URL (legacy or external) or data URI, return as is
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }

  const baseUrl = config.storage.publicUrl;

  // Normalize slashes
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Ensure the path includes the 'review-images' folder if missing
  // This handles legacy paths that were stored without the folder prefix
  let finalPath = cleanPath;
  if (!cleanPath.startsWith('review-images/')) {
    finalPath = `review-images/${cleanPath}`;
  }

  // If base is empty, we just return path (maybe leading slash removed)
  // This handles case where no config is present
  if (!cleanBase) return finalPath;

  // Encode the path to ensure spaces and special characters are handled correctly
  // We use encodeURI to preserve slashes in the path
  const encodedPath = encodeURI(finalPath);

  return `${cleanBase}/${encodedPath}`;
};
