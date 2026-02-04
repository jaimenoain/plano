import { test, expect } from '@playwright/test';

test('map does not snap to search results if user interacts while loading', async ({ page }) => {
  // Mock Auth
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
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        user: { id: 'user-123', email: 'test@example.com', user_metadata: { onboarding_completed: true }, app_metadata: {}, aud: 'authenticated' },
    }));
  });

  await page.setViewportSize({ width: 1280, height: 800 });

  // Navigate to search
  await page.goto('http://localhost:8080/search');

  // Wait for map to be visible
  // Use visible=true to select the desktop map and avoid strict mode violation
  const mapContainer = page.locator('[data-testid="map-container"]').locator('visible=true');
  await expect(mapContainer).toBeVisible();

  // Setup interception for the search query to introduce delay
  let resolveSearch;
  const searchPromise = new Promise(resolve => { resolveSearch = resolve; });

  await page.route('**/rest/v1/rpc/search_buildings*', async (route) => {
    // Check if this is the search for "New York"
    const postData = route.request().postDataJSON();
    if (postData && postData.query_text && postData.query_text.includes('New York')) {
       console.log('Intercepted New York search. Delaying response...');
       await searchPromise;
       console.log('Resuming New York search.');

       // Mock a response with New York coordinates
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify([{
           id: 'building-ny',
           name: 'Empire State',
           location_lat: 40.7484,
           location_lng: -73.9857,
           city: 'New York',
           status: 'Built'
         }])
       });
    } else {
       await route.continue();
    }
  });

  // Type search
  const searchInput = page.locator('input[placeholder*="Search buildings"]').locator('visible=true');
  await searchInput.fill('New York');
  await searchInput.press('Enter');

  console.log('Search triggered. Waiting for interaction...');

  // SIMULATE INTERACTION immediately
  // Drag the map.
  const mapCanvas = mapContainer.locator('canvas');
  const box = await mapCanvas.boundingBox();
  if (!box) throw new Error('No map canvas found');

  // Move from center to right-bottom
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100, { steps: 10 });
  await page.mouse.up();

  console.log('Interaction completed.');

  // Release the search data
  resolveSearch();

  // Wait for potential erratic jump
  await page.waitForTimeout(3000);

  // Check URL.
  // We started at default (London ~51.5).
  // We dragged slightly (maybe to ~51.4).
  // New York is ~40.7.
  // If the bug occurred, the map would snap to New York (~40.7).
  // If fixed, it should stay near London (> 45).

  const url = new URL(page.url());
  const lat = parseFloat(url.searchParams.get('lat') || '0');
  const lng = parseFloat(url.searchParams.get('lng') || '0');

  console.log('Final URL Lat:', lat, 'Lng:', lng);

  expect(lat).toBeGreaterThan(45);
});
