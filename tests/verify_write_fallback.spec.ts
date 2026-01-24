import { test, expect } from '@playwright/test';

test('verify write fallback to log table', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Mock Auth
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake-token",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "test-user-id",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated"
        }
    }));
  });

  // Mock RPC calls or dependent reads to allow page load
  await page.route('**/rest/v1/buildings*', async route => {
      // Return fake building
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              id: 'test-building-id',
              name: 'Test Building',
              main_image_url: null,
              year_completed: 2020
          })
      });
  });

  // Mock user_buildings (simulating missing table)
  await page.route('**/rest/v1/user_buildings*', async route => {
      await route.fulfill({ status: 404, body: 'Table not found' });
  });

  // Mock log (simulating legacy table)
  await page.route('**/rest/v1/log*', async route => {
      if (route.request().method() === 'GET') {
          // Return null (not visited yet)
          // PostgREST returns [] for empty list or null for single?
          // fetchUserBuildingStatus uses maybeSingle(), so [] or null is fine.
          await route.fulfill({ status: 200, body: '[]' });
      } else if (route.request().method() === 'POST') {
          // Upsert success
          const postData = route.request().postDataJSON();
          console.log('Mock log POST received:', postData);

          // Verify payload maps correctly
          if (postData.film_id === 'test-building-id' && (postData.status === 'watched' || postData.status === 'watchlist')) {
             await route.fulfill({ status: 201, body: JSON.stringify(postData) });
          } else {
             console.error('Mock log POST bad payload:', postData);
             await route.fulfill({ status: 400, body: 'Bad Payload' });
          }
      } else {
          await route.continue();
      }
  });

  // Navigate to Post page for a building
  // We mock the building fetch via building table route, but wait,
  // Post.tsx now uses fetchBuildingDetails which tries 'buildings' then 'films'.
  // My mock for 'buildings' returns success, so it shouldn't fallback to films for read.
  // This verifies that we can read from mock buildings.

  await page.goto('http://localhost:8080/post?id=test-building-id');

  // Wait for page load
  await expect(page.locator('text=Rate & Review')).toBeVisible();

  // Click "Bucket List"
  await page.click('text=Bucket List');

  // Click Save
  await page.click('text=Save');

  // Expect success toast
  await expect(page.locator('text=Added to bucket list!').first()).toBeVisible();

  // Screenshot
  await page.screenshot({ path: 'verification_write_fallback.png' });
});
