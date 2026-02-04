import { test, expect } from '@playwright/test';

test('map interaction cancels pending fitBounds command (debounce race condition)', async ({ page }) => {
  // Go to search page
  await page.goto('http://localhost:8080/search');

  // Wait for map
  const mapContainer = page.locator('[data-testid="map-container"]').locator('visible=true');
  await expect(mapContainer).toBeVisible({ timeout: 10000 });

  // Setup interception for search
  let searchRequestResolve: (value: any) => void;
  const searchRequestPromise = new Promise(resolve => {
    searchRequestResolve = resolve;
  });

  await page.route('**/functions/v1/search_buildings_rpc', async route => {
    await searchRequestPromise;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'paris-building',
          name: 'Paris Building',
          location_lat: 48.8566,
          location_lng: 2.3522,
          main_image_url: null,
          status: 'visited'
        }
      ])
    });
  });

  // Type search query
  const searchInput = page.getByPlaceholder(/Search buildings/i).locator('visible=true');
  await searchInput.fill('Paris');
  await searchInput.press('Enter');

  // Wait for the request to be intercepted (stalled)
  // We can't easily wait for "request is pending" in Playwright without a bit of hackery,
  // but we know it fires after Enter.
  await page.waitForTimeout(500); // Give it time to fire the request

  console.log('Releasing search response...');
  searchRequestResolve!(null); // Release the network block

  // IMMEDIATELY interact with the map to trigger onMoveStart
  // The SearchPage will receive data -> call fitBounds -> debounce 100ms
  // We want to start moving BEFORE that 100ms expires.

  const mapBox = await mapContainer.boundingBox();
  if (!mapBox) throw new Error('Map not found');

  const startX = mapBox.x + mapBox.width / 2;
  const startY = mapBox.y + mapBox.height / 2;

  // Move mouse to center
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  console.log('Starting drag...');
  // Drag significantly but QUICKLY (less than 100ms total interaction)
  // fitBounds debounce is 100ms.
  // We want to trigger onMoveStart (which should cancel the debounce), then stop.
  // If we don't cancel it, the timeout will fire AFTER we stop, moving the map.

  await page.mouse.move(startX + 100, startY + 100, { steps: 2 }); // Fast drag
  await page.waitForTimeout(50); // Short hold

  // Release
  await page.mouse.up();
  console.log('Drag released.');

  // Now wait for the debounce (100ms) to theoretically fire
  await page.waitForTimeout(500);

  // Check URL or Map Center
  // If "Paris" search succeeded and overrode us, we'd be at ~48.85, 2.35
  // If we stayed put (London/Initial), we'd be near 51.5, -0.12 (plus our drag)

  // Let's get the URL params
  const url = new URL(page.url());
  const lat = parseFloat(url.searchParams.get('lat') || '0');
  const lng = parseFloat(url.searchParams.get('lng') || '0');

  console.log(`Final Lat: ${lat}, Lng: ${lng}`);

  // Paris is Lat ~48. If we are still near 51, we avoided the jump.
  expect(lat).toBeGreaterThan(50); // Still in UK/London area
  expect(lat).toBeLessThan(53);
});
