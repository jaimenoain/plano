import { test, expect } from '@playwright/test';

const DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const UPLOAD_URL = "https://fake-s3.example.com/upload/key";

test('User can upload photo to building', async ({ page }) => {
  // 1. Mock Session
  await page.addInitScript((token) => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: token,
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated"
        }
    }));
  }, DUMMY_JWT);

  // 2. Mock Building Data
  await page.route('**/rest/v1/rpc/get_building_reviews*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/rest/v1/buildings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
          id: "b1",
          name: "Test Building",
          location: `POINT(0 0)`,
          status: "Built",
          main_image_url: null,
          slug: "test-building",
          architects: [],
          typologies: [],
          attributes: [],
          created_by: "other-user"
      }),
    });
  });

  await page.route('**/rest/v1/user_buildings*', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
         // Return empty initially (no review yet)
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(null), // maybeSingle returns null
        });
    } else if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
        // Mock Upsert
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: "review-123",
                user_id: "user-uuid",
                building_id: "b1",
                status: "visited"
            }),
        });
    } else {
        await route.continue();
    }
  });

  // Mock Review Links/Collections/Follows to avoid errors
  await page.route('**/rest/v1/review_links*', async route => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/collection_items*', async route => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/follows*', async route => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/architect_claims*', async route => route.fulfill({ json: [] }));

  // 3. Mock Upload Flow
  // Mock 'generate-upload-url' function
  await page.route('**/functions/v1/generate-upload-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: UPLOAD_URL,
        key: "path/to/image.jpg"
      }),
    });
  });

  // Mock S3 Upload
  await page.route(UPLOAD_URL, async (route) => {
    if (route.request().method() === 'PUT') {
        await route.fulfill({
            status: 200,
            body: "OK"
        });
    } else {
        await route.continue();
    }
  });

  // Mock review_images insert
  let imageInserted = false;
  await page.route('**/rest/v1/review_images*', async (route) => {
      if (route.request().method() === 'POST') {
          imageInserted = true;
          await route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({ id: "img-123", storage_path: "path/to/image.jpg" }),
          });
      } else {
          await route.continue();
      }
  });


  // 4. Navigate to Building
  await page.goto('http://localhost:8080/building/tb/test-building');

  // Wait for load
  // Use .first() to handle responsive duplicate elements, but ensure we check for visibility correctly
  // Filter for visible elements first
  const heading = page.locator('h1', { hasText: 'Test Building' }).locator('visible=true').first();
  await expect(heading).toBeVisible();

  // 5. Interact
  // Click "Save" or "Visited" to enable edit mode (or if "Add Note" is available)
  // In BuildingDetails.tsx, "Add media" button is visible when editing note.
  // We need to trigger "handleStatusChange" or be in edit mode.
  // The UI shows "Save" / "Visited" buttons initially.

  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Now "Your Note" textarea should appear
  await expect(page.getByPlaceholder('Write a note...')).toBeVisible();

  // "Add media" button should be visible
  // It triggers a hidden file input.

  // We can locate the hidden input and set files directly
  const fileInput = page.locator('input[type="file"]');

  // Create a dummy file
  await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('this is a test image')
  });

  // Should see preview
  // "Render" / "Photo" button appears on preview
  await expect(page.getByRole('button', { name: 'Photo' })).toBeVisible();

  // Click Save
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Verify Toast "Review saved"
  await expect(page.getByText('Review saved').first()).toBeVisible();

  // Verify Backend Calls
  expect(imageInserted).toBe(true);
});
