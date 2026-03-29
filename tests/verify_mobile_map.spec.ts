import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE size
});

test('verify add building map height on mobile', async ({ page }) => {
  // Go to Add Building page
  await page.goto('http://localhost:8080/add-building');

  // Wait for the map container
  const mapContainer = page.locator('.h-\\[300px\\]');

  // Verify it exists (meaning the class was applied correctly)
  await expect(mapContainer).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'verification/mobile_map_height.png', fullPage: true });
});
