import { test, expect } from '@playwright/test';

test('programmatic map movement during search does not update URL location params', async ({ page }) => {
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

  // Wait for map
  const mapContainer = page.locator('[data-testid="map-container"]').locator('visible=true');
  await expect(mapContainer).toBeVisible({ timeout: 10000 });

  // Mock search for "Paris"
  await page.route('**/rest/v1/rpc/search_buildings*', async (route) => {
    const postData = route.request().postDataJSON();
    if (postData && postData.query_text && postData.query_text.includes('Paris')) {
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify([{
           id: 'building-paris',
           name: 'Eiffel Tower',
           location_lat: 48.8584,
           location_lng: 2.2945,
           city: 'Paris',
           status: 'Built'
         }])
       });
    } else {
       await route.continue();
    }
  });

  // Check initial URL (should be near London default ~51.5)
  await page.waitForTimeout(2000);
  let url = new URL(page.url());
  let lat = url.searchParams.get('lat');
  // Default might be null or 51.5074. If null, it means internal state is default.
  // The URL params logic: useEffect syncs state to URL.
  // So it should be present.
  const initialLat = parseFloat(lat || '51.5074');
  console.log('Initial Lat:', initialLat);
  expect(initialLat).toBeCloseTo(51.5, 0);

  // Type search
  const searchInput = page.locator('input[placeholder*="Search buildings"]').locator('visible=true');
  await searchInput.fill('Paris');

  // Wait for search result and potential map fly
  // We wait enough time for debounce (300ms) + fetch + fly animation (usually a second or two)
  console.log('Waiting for search and fly...');
  await page.waitForTimeout(4000);

  // Check URL again
  url = new URL(page.url());
  const newLat = parseFloat(url.searchParams.get('lat') || '0');
  console.log('New Lat:', newLat);

  // Expectation: IT SHOULD NOT CHANGE significantly (should remain London)
  // If bug exists, it will be ~48.8
  expect(newLat).toBeCloseTo(51.5, 0);
  expect(newLat).not.toBeCloseTo(48.8, 1);

  // Now verify manual interaction works
  // Drag the map
  console.log('Simulating drag...');
  const mapCanvas = mapContainer.locator('canvas');
  const box = await mapCanvas.boundingBox();
  if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Drag significantly
      await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 200, { steps: 20 });
      await page.mouse.up();
  }

  // Wait for update
  await page.waitForTimeout(2000);

  url = new URL(page.url());
  const draggedLat = parseFloat(url.searchParams.get('lat') || '0');
  console.log('Dragged Lat:', draggedLat);

  // Should have changed from initial London location
  // Dragging south-east (positive x, positive y) generally moves the map center... wait.
  // If I drag mouse down-right, I am pulling the map. The center moves UP-LEFT.
  // So Lat should increase (North), Lng should decrease (West).
  // Wait, map drag physics: if I drag map South (mouse down), the view moves North? No.
  // If I drag mouse DOWN, the map image moves DOWN. The viewport center moves NORTH relative to the map.
  // So Lat should increase.

  // Regardless, it should change.
  expect(draggedLat).not.toBeCloseTo(51.5, 2);

  await page.screenshot({ path: 'verification.png' });
});
