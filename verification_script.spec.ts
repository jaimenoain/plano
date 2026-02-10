
import { test, expect } from '@playwright/test';

test('verify tooltip image size', async ({ page }) => {
  // Mock the Supabase RPC call for map clusters
  await page.route('**/rest/v1/rpc/get_map_clusters_v2**', async route => {
    const json = [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        lat: 51.505,
        lng: -0.09,
        is_cluster: false,
        count: 1,
        rating: 4.5,
        status: null,
        name: "Test Building with Long Name to Check Wrap",
        slug: "test-building",
        // Use a placeholder image that is rectangular to verify it is forced to square
        image_url: "https://placehold.co/400x300/png"
      }
    ];
    await route.fulfill({ json });
  });

  // Navigate to the map page
  // Assuming the map is at the root or /map. Let's try root first as SearchPage is there.
  await page.goto('http://localhost:5173/');

  // Wait for the map to load.
  // The map likely has a canvas element.
  await page.waitForSelector('.maplibregl-canvas');

  // We need to wait for our marker to be rendered.
  // The marker has data-testid="map-marker-building"
  const marker = page.locator('[data-testid="map-marker-building"]');
  await marker.waitFor({ state: 'visible', timeout: 10000 });

  // Hover over the marker to trigger the popup
  await marker.hover();

  // Wait for the popup to appear
  // The popup content has a class "map-popup-test" (as seen in the code)
  const popup = page.locator('.map-popup-test');
  await popup.waitFor({ state: 'visible', timeout: 5000 });

  // Wait a bit for image to load
  await page.waitForTimeout(1000);

  // Take a screenshot of the popup
  await popup.screenshot({ path: '/home/jules/verification/tooltip_verification.png' });
});
