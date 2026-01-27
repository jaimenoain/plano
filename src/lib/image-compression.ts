/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * and compresses it to JPEG format.
 *
 * @param file The original image file
 * @param maxWidth Maximum width in pixels (default: 1500)
 * @param maxHeight Maximum height in pixels (default: 1500)
 * @param quality Compression quality from 0 to 1 (default: 0.85)
 * @returns A Promise that resolves to the compressed File object, or the original file on failure.
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 1500,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve) => {
    // Fail gracefully if not an image
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          try {
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
              resolve(file); // Fallback
              return;
            }

            // Fill background with white to handle transparency (e.g. PNG to JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

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

            // Enforce JPEG
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  finalize(blob, 'jpg', 'image/jpeg');
                } else {
                  resolve(file); // Fallback
                }
              },
              'image/jpeg',
              quality
            );
          } catch (e) {
            console.error('Error processing image:', e);
            resolve(file);
          }
        };

        img.onerror = (error) => {
          console.error('Failed to load image:', error);
          resolve(file);
        };
      };

      reader.onerror = (error) => {
        console.error('Failed to read file:', error);
        resolve(file);
      };
    } catch (e) {
      console.error('Unexpected error in resizeImage:', e);
      resolve(file);
    }
  });
}
