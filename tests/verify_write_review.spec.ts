import { test, expect } from '@playwright/test';

test('Verify Write Review Page', async ({ page }) => {
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

  const buildingId = 'building-123';

  // 2. Mock Network Requests
  await page.route('**', async route => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock Building Details for Review Page (fetching name)
    // Query: select name, id=eq...
    if (url.includes(`rest/v1/buildings`) && url.includes(`select=name`) && url.includes(`id=eq.${buildingId}`)) {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ name: 'Test Building' })
       });
       return;
    }

    // Mock Building Details for the main page (more fields)
    if (url.includes(`rest/v1/buildings`) && url.includes(`id=eq.${buildingId}`) && !url.includes(`select=name`)) {
       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: buildingId,
              name: 'Test Building',
              location: null, // location parsing handles null
              address: '123 Test St',
              created_by: 'other-user',
              main_image_url: null,
              architects: ['Test Architect'],
              year_completed: 2020,
              styles: ['Modern'],
              description: 'A test building'
          })
       });
       return;
    }

    // Mock Existing Review (null initially)
    // The query usually has user_id=eq... and building_id=eq...
    if (url.includes('rest/v1/user_buildings') && method === 'GET') {
       // Check if it asks for maybeSingle (Accept header or count=exact) - usually supabase-js handles this
       // We'll just return null or empty array depending on what the client expects for maybeSingle
       // maybeSingle expects 0 or 1 row.
       // If we return [], it might be fine, or null if using vnd.pgrst.object+json

       await route.fulfill({
          status: 200, // 200 OK
          contentType: 'application/json',
          body: 'null' // effectively null
       });
       return;
    }

    // Mock Feed (Building Details asks for feed)
    if (url.includes('rest/v1/user_buildings') && method === 'GET' && url.includes('select=')) {
        // This overlaps with the one above, but feed usually asks for more fields like user:profiles(...)
        // Let's make the previous one specific to user_id check if possible, or just return []
        if (url.includes('user:profiles')) {
             await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
             });
             return;
        }
    }

    // Mock Upsert Review
    if (url.includes('rest/v1/user_buildings') && (method === 'POST' || method === 'PATCH')) {
       console.log('Intercepted Upsert Review');
       const requestData = route.request().postDataJSON();
       // Verify data
       if (requestData.rating !== 4 || requestData.content !== 'This is a test review.') {
           console.error('Unexpected payload:', requestData);
       }

       await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'review-uuid', ...requestData })
       });
       return;
    }

    // Mock Image Upload
    if (url.includes('storage/v1/object/review_images')) {
        console.log('Intercepted Image Upload');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ Key: 'review_images/user-uuid/building-123/image.webp' })
        });
        return;
    }

    // Mock Image Record Insert
    if (url.includes('rest/v1/review_images') && method === 'POST') {
        console.log('Intercepted Review Image Insert');
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'image-uuid' })
        });
        return;
    }

    // Pass through others
    try {
        await route.continue();
    } catch (e) {
        // ignore already handled errors
    }
  });

  // 3. Test Navigation from Building Details
  console.log('Navigating to Building Details...');
  await page.goto(`http://localhost:8080/building/${buildingId}`);

  // Verify "Write Review" button exists
  // It might be "Write Review" or "Edit Review" depending on state, but we mocked null existing review.
  const reviewLink = page.getByRole('link', { name: 'Write Review' });
  await expect(reviewLink).toBeVisible();

  // Click it
  await reviewLink.click();

  // Verify we are on the review page
  await expect(page).toHaveURL(new RegExp(`/building/${buildingId}/review`));
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // 4. Fill Review
  console.log('Filling review...');
  const starButtons = page.locator('button:has(.lucide-star)');
  // Depending on implementation, there might be more star icons (e.g. in header?), but let's assume the rating ones are unique buttons
  // The rating buttons are: <button ...><Star .../></button>
  // Let's filter by aria-label or just take the set.
  // There are 5 stars.
  await expect(starButtons).toHaveCount(5);
  await starButtons.nth(3).click(); // 4th star

  // Check text "4/5"
  await expect(page.getByText('4/5')).toBeVisible();

  // Fill text
  await page.getByRole('textbox').fill('This is a test review.');

  // 5. Upload Image
  console.log('Uploading image...');
  // Create a dummy image buffer (small transparent gif)
  const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer: buffer
  });

  // Check preview appears
  await expect(page.locator('img[alt="Preview"]')).toBeVisible();

  // 6. Submit
  console.log('Submitting...');
  const submitBtn = page.getByRole('button', { name: 'Publish Review' });
  await submitBtn.click();

  // 7. Verify Redirect
  // Wait for navigation
  await expect(page).toHaveURL(`http://localhost:8080/building/${buildingId}`);
  console.log('Successfully redirected.');

  // Check that we are back on building details
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();
});
