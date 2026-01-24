/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * and compresses it to WebP format (falling back to JPEG if WebP is unsupported).
 *
 * @param file The original image file
 * @param maxWidth Maximum width in pixels (default: 1920)
 * @param maxHeight Maximum height in pixels (default: 1920)
 * @param quality Compression quality from 0 to 1 (default: 0.8)
 * @returns A Promise that resolves to the compressed File object
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Fail fast if not an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling factor to maintain aspect ratio within bounds
        const scale = Math.min(
          maxWidth / width,
          maxHeight / height,
          1 // Never scale up
        );

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const finalize = (blob: Blob, ext: string, type: string) => {
          const nameParts = file.name.split('.');
          if (nameParts.length > 1) nameParts.pop(); // Remove extension if present
          const newName = `${nameParts.join('.')}.${ext}`;

          const newFile = new File([blob], newName, {
            type: type,
            lastModified: Date.now(),
          });
          resolve(newFile);
        };

        // Try WebP first
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Check if browser actually supported WebP
              if (blob.type === 'image/webp') {
                finalize(blob, 'webp', 'image/webp');
              } else {
                // Fallback to JPEG if WebP is not supported (browser returned PNG or other)
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob) {
                      finalize(jpegBlob, 'jpg', 'image/jpeg');
                    } else {
                      reject(new Error('Canvas to Blob (JPEG fallback) failed'));
                    }
                  },
                  'image/jpeg',
                  quality
                );
              }
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = (error) => reject(new Error('Failed to load image'));
    };

    reader.onerror = (error) => reject(new Error('Failed to read file'));
  });
}
