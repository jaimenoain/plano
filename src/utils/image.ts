
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

// Helper to get environment variables safely in both Vite and Node environments
const getEnv = (key: string): string | undefined => {
  // Check import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // import.meta might not be available
  }

  // Check process.env (Node/Testing)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // process might not be available
  }

  return undefined;
};

export const getBuildingImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;

  // If it's already a full URL (legacy or external), return as is
  if (path.startsWith("http") || path.startsWith("blob:")) {
    return path;
  }

  const customUrl = getEnv('VITE_PUBLIC_STORAGE_URL');
  let baseUrl = '';

  if (customUrl) {
    baseUrl = customUrl;
  } else {
    // Default to S3 bucket
    baseUrl = "https://s3.eu-west-2.amazonaws.com/plano.app";
  }

  // Normalize slashes
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // If base is empty, we just return path (maybe leading slash removed)
  // This handles case where no config is present
  if (!cleanBase) return cleanPath;

  // Encode the path to ensure spaces and special characters are handled correctly
  // We use encodeURI to preserve slashes in the path
  const encodedPath = encodeURI(cleanPath);

  return `${cleanBase}/${encodedPath}`;
};
