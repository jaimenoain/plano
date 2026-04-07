/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio,
 * and compresses it to JPEG format.
 */

export type ResizeImageResult = {
  file: File;
  /** Output canvas width after resize; null if unchanged / non-image / failure */
  width: number | null;
  height: number | null;
};

/**
 * @param file The original image file
 * @param maxWidth Maximum width in pixels (default: 1500)
 * @param maxHeight Maximum height in pixels (default: 1500)
 * @param quality Compression quality from 0 to 1 (default: 0.85)
 */
export async function resizeImageWithDimensions(
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 1500,
  quality: number = 0.85,
): Promise<ResizeImageResult> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ file, width: null, height: null });
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

            const scale = Math.min(
              maxWidth / width,
              maxHeight / height,
              1,
            );

            width = Math.round(width * scale);
            height = Math.round(height * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve({ file, width: null, height: null });
              return;
            }

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            const finalize = (blob: Blob, ext: string, type: string) => {
              const nameParts = file.name.split(".");
              if (nameParts.length > 1) nameParts.pop();
              const newName = `${nameParts.join(".")}.${ext}`;

              const newFile = new File([blob], newName, {
                type,
                lastModified: Date.now(),
              });
              resolve({ file: newFile, width, height });
            };

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  finalize(blob, "jpg", "image/jpeg");
                } else {
                  resolve({ file, width: null, height: null });
                }
              },
              "image/jpeg",
              quality,
            );
          } catch (_e) {
            resolve({ file, width: null, height: null });
          }
        };

        img.onerror = (_error) => {
          resolve({ file, width: null, height: null });
        };
      };

      reader.onerror = (_error) => {
        resolve({ file, width: null, height: null });
      };
    } catch (_e) {
      resolve({ file, width: null, height: null });
    }
  });
}

/**
 * @returns A Promise that resolves to the compressed File object, or the original file on failure.
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 1500,
  quality: number = 0.85,
): Promise<File> {
  const { file: out } = await resizeImageWithDimensions(
    file,
    maxWidth,
    maxHeight,
    quality,
  );
  return out;
}
