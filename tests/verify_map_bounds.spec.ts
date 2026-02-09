import { test, expect } from '@playwright/test';

test('search page map requests include bounds', async ({ page }) => {
  // Mock Supabase Auth
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { onboarding_completed: true },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }),
    });
  });

  // Inject token
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sb-lnqxtomyucnnrgeapnzt-auth-token',
      JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { onboarding_completed: true },
          app_metadata: {},
          aud: 'authenticated',
        },
      })
    );
  });

  // Intercept RPC calls
  let boundsRequestFound = false;
  await page.route('**/rest/v1/rpc/get_map_pins*', async (route) => {
    const postData = route.request().postDataJSON();
    console.log('RPC Call:', postData);

    // Check if min_lat/max_lat are present
    if (postData && typeof postData.min_lat === 'number' && typeof postData.max_lat === 'number') {
      boundsRequestFound = true;
      console.log('Found bounds in request:', postData);
    }

    // Mock response with empty list to avoid actual network errors
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // Navigate to search page
  await page.goto('http://localhost:8080/search');

  // Wait for map to load and stabilize
  // The map might make an initial request without bounds (if currentBounds is null)
  // Then it should make a request with bounds once loaded.

  // Simulate map movement or wait for initial load completion
  // We can wait for a bit
  await page.waitForTimeout(3000);

  // Drag the map to trigger a move
  // Note: Dragging map in Playwright can be tricky with MapLibre, but let's try
  const mapContainer = page.locator('.maplibregl-canvas');
  if (await mapContainer.count() > 0) {
      const box = await mapContainer.boundingBox();
      if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100);
          await page.mouse.up();
      }
  }

  // Wait for debounce and fetch
  await page.waitForTimeout(2000);

  expect(boundsRequestFound).toBe(true);
});
