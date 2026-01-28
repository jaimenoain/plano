import { test, expect } from '@playwright/test';

test('Verify Optional Rating in Write Review Page', async ({ page }) => {
  // 1. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake-token",
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
  });

  const buildingId = '00000000-0000-0000-0000-000000000123';

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
                role: "authenticated"
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
              styles: [{ style: { id: 'style-1', name: 'Modern' } }],
              year_completed: 2020
          })
       });
       return;
    }

    // Mock Existing Review (null initially)
    if (url.includes('rest/v1/user_buildings') && method === 'GET') {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'null'
       });
       return;
    }

    // Mock Review Links Delete
    if (url.includes('rest/v1/review_links') && method === 'DELETE') {
        await route.fulfill({ status: 204 });
        return;
    }

    // Mock Upsert Review
    if (url.includes('rest/v1/user_buildings') && (method === 'POST' || method === 'PATCH')) {
       console.log('Intercepted Upsert Review');
       const requestData = route.request().postDataJSON();

       // Verify that rating is null or allowed to be missing
       if (requestData.rating !== null && requestData.rating !== 0) {
           console.log('Rating sent:', requestData.rating);
       } else {
           console.log('Rating is null or 0 as expected');
       }

       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'review-uuid', ...requestData })
       });
       return;
    }

    // Pass through others
    try {
        await route.continue();
    } catch (e) {
        // ignore
    }
  });

  // 3. Go directly to Review Page
  await page.goto(`http://localhost:8080/building/${buildingId}/review`);

  // Verify we are on the review page
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // 4. Ensure no rating is selected (default state)
  const ratingButtons = page.locator('button:has(.lucide-circle)');
  await expect(ratingButtons).toHaveCount(5);
  // None should be filled (checking class or visual state is hard, but we know default rating is 0)

  // 5. Check if Submit button is enabled
  const submitBtn = page.getByRole('button', { name: 'Publish Review' });
  await expect(submitBtn).toBeEnabled();

  // 6. Submit without rating
  console.log('Submitting without rating...');

  // We need to track the request to verify payload
  const requestPromise = page.waitForRequest(req =>
    req.url().includes('rest/v1/user_buildings') && (req.method() === 'POST' || req.method() === 'PATCH')
  );

  await submitBtn.click();

  const request = await requestPromise;
  const postData = request.postDataJSON();

  expect(postData.rating).toBeNull(); // We explicitly set it to null in the code

  // 7. Verify Redirect or Success
  await expect(page).toHaveURL(/building\/.*\/test-building/);
  console.log('Submission successful without rating');

});
