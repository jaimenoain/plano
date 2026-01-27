import { test, expect } from '@playwright/test';

test('Verify Delete Review', async ({ page }) => {
  // 1. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "x.y.z",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: { onboarding_completed: true }
        }
    }));
  });

  const buildingId = '00000000-0000-0000-0000-000000000123';
  const reviewId = 'review-uuid-existing';

  // 2. Mock Network Requests
  await page.route('**', async route => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock Auth User
    if (url.includes('auth/v1/user')) {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: "user-uuid",
                email: "test@example.com",
                aud: "authenticated",
                role: "authenticated",
                user_metadata: { onboarding_completed: true }
            })
        });
        return;
    }

    // Mock Building Details
    if (url.includes(`rest/v1/buildings`) && (url.includes(`id=eq.${buildingId}`) || url.includes(`short_id=eq.123`))) {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: buildingId,
              name: 'Test Building',
              slug: 'test-building',
              short_id: 123,
              location: null,
              address: '123 Test St',
              created_by: 'other-user',
              main_image_url: null,
              styles: [],
              year_completed: 2020,
              description: 'A test building'
          })
       });
       return;
    }

    // Mock Existing Review (Return a review this time!)
    if (url.includes('rest/v1/user_buildings') && method === 'GET' && !url.includes('count=exact')) {
       // Check if it's the check for existing review
       if (url.includes(`user_id=eq.user-uuid`) && url.includes(`building_id=eq.${buildingId}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: reviewId,
                    rating: 5,
                    content: 'Great place!',
                    status: 'visited',
                    tags: ['List 1'],
                    visibility: 'public',
                    building_id: buildingId,
                    user_id: 'user-uuid'
                })
            });
            return;
       }
    }

    // Mock Fetch Review Links
    if (url.includes('rest/v1/review_links') && method === 'GET') {
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
         });
         return;
    }

    // Mock Fetch Review Images
    if (url.includes('rest/v1/review_images') && method === 'GET') {
         await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
         });
         return;
    }

    // Mock DELETE Review Images (S3) - deleteFiles calls functions/v1/delete-files usually?
    // Or maybe it calls storage directly?
    // Let's mock both just in case, though in this test we have no images.

    // Mock DELETE User Building
    if (url.includes(`rest/v1/user_buildings`) && method === 'DELETE') {
        if (url.includes(`id=eq.${reviewId}`)) {
            console.log('Intercepted DELETE Review');
            await route.fulfill({ status: 204 });
            return;
        }
    }

    try {
        await route.continue();
    } catch (e) {}
  });

  // 3. Go to Review Page
  await page.goto(`http://localhost:8080/building/${buildingId}/review`);

  // Verify we are on the page
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // 4. Verify Content is populated (so we know we loaded the existing review)
  await expect(page.getByText('5/5')).toBeVisible();
  const textarea = page.locator('textarea');
  await expect(textarea).toHaveValue('Great place!');

  // 5. Verify Delete Button Exists
  const deleteBtn = page.getByRole('button', { name: 'Delete Review' });
  await expect(deleteBtn).toBeVisible();

  // 6. Click Delete and Check Dialog
  await deleteBtn.click();

  const dialog = page.getByRole('alertdialog'); // or 'dialog'
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Are you sure?');

  // 7. Confirm Delete
  await dialog.getByRole('button', { name: 'Delete' }).click();

  // 8. Verify Redirect
  await expect(page).toHaveURL(`http://localhost:8080/building/123/test-building`);

});
