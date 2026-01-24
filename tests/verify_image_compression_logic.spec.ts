import { test, expect } from '@playwright/test';

test('verify client-side image compression logic', async ({ page }) => {
  // Navigate to any page to get a browser context
  await page.goto('about:blank');

  // Inject the logic and run verification
  const result = await page.evaluate(async () => {
    // ----------------------------------------------------------------
    // INJECTED LOGIC FROM src/lib/image-compression.ts
    // ----------------------------------------------------------------
    async function resizeImage(
      file: File,
      maxWidth: number = 1920,
      maxHeight: number = 1920,
      quality: number = 0.8
    ): Promise<{ width: number; height: number; size: number; type: string }> {
      return new Promise((resolve, reject) => {
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

            const scale = Math.min(
              maxWidth / width,
              maxHeight / height,
              1
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

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const finalize = (blob: Blob, ext: string, type: string) => {
                // In test, we return metadata
                resolve({
                    width: width,
                    height: height,
                    size: blob.size,
                    type: type
                });
            };

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  if (blob.type === 'image/webp') {
                    finalize(blob, 'webp', 'image/webp');
                  } else {
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
          img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
      });
    }

    // ----------------------------------------------------------------
    // TEST HELPERS
    // ----------------------------------------------------------------
    function createLargeImageFile(width: number, height: number): Promise<File> {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = 'blue';
            ctx.fillRect(0, 0, width / 2, height / 2);

            canvas.toBlob((blob) => {
                const file = new File([blob!], 'test.png', { type: 'image/png' });
                resolve(file);
            }, 'image/png');
        });
    }

    // ----------------------------------------------------------------
    // EXECUTION
    // ----------------------------------------------------------------
    const originalWidth = 3000;
    const originalHeight = 2000;
    const largeFile = await createLargeImageFile(originalWidth, originalHeight);

    // Test 1: Resize to default
    const result1 = await resizeImage(largeFile, 1920, 1920, 0.8);

    // Test 2: Resize to custom small size
    const result2 = await resizeImage(largeFile, 100, 100, 0.5);

    return {
        originalSize: largeFile.size,
        result1,
        result2
    };
  });

  console.log('Test Result:', result);

  expect(result.result1.width).toBe(1920);
  expect(result.result1.height).toBe(1280);
  // Headless Chrome supports WebP, so we expect WebP
  expect(result.result1.type).toBe('image/webp');
  expect(result.result1.size).toBeLessThan(result.originalSize);

  expect(result.result2.width).toBe(100);
  expect(result.result2.height).toBe(67);
});
