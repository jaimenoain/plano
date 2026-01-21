
/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * and compresses it to WebP format.
 *
 * @param file The original image file
 * @param maxWidth Maximum width in pixels (default: 2048)
 * @param maxHeight Maximum height in pixels (default: 2048)
 * @param quality Compression quality from 0 to 1 (default: 0.8)
 * @returns A Promise that resolves to the compressed File object
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
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
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use better quality interpolation if browser supports it (default usually fine)
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new filename with .webp extension
              const nameParts = file.name.split('.');
              nameParts.pop();
              const newName = `${nameParts.join('.')}.webp`;

              const newFile = new File([blob], newName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(newFile);
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
