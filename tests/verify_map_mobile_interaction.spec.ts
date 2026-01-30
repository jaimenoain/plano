import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('verify map mobile interaction: tap to select, tap to navigate', async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

  // 1. Simulate Mobile Viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // 2. Mock Data
  const buildingId = 'test-building-id';
  const buildingName = 'Test Building';

  // Mock search buildings RPC
  await page.route('**/rest/v1/rpc/search_buildings', async route => {
    console.log('Mocking search_buildings request matched!');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: buildingId,
        name: buildingName,
        location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
        location_lat: 51.5074,
        location_lng: -0.1278,
        main_image_url: 'test.jpg',
        location_precision: 'exact',
        distance: 0,
        architects: [],
        year_completed: 2020,
        city: 'London',
        country: 'UK',
        status: null
      }])
    });
  });

  // Mock enrichment calls
  await page.route('**/rest/v1/buildings?*', async route => route.fulfill({ status: 200, body: '[]' }));
  await page.route('**/rest/v1/follows?*', async route => route.fulfill({ status: 200, body: '[]' }));
  await page.route('**/rest/v1/user_buildings?*', async route => route.fulfill({ status: 200, body: '[]' }));
  await page.route('**/rest/v1/collection_items?*', async route => route.fulfill({ status: 200, body: '[]' }));

  // Mock auth
  await page.addInitScript(() => {
    localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      user: { id: 'test-user-id', aud: 'authenticated', email: 'test@example.com' }
    }));
  });

  // Force touch capability mock
  await page.addInitScript(() => {
    window.matchMedia = (query) => {
      return {
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
  });

  console.log('Navigating to search page...');
  await page.goto('http://localhost:3000/search');

  // Check if Map Container is visible (target the one for mobile)
  const visibleMap = page.locator('[data-testid="map-container"]:visible');

  if (await visibleMap.count() === 0) {
      console.log('Map container is NOT visible. Checking view toggle...');
      const toggle = page.getByRole('button', { name: /Map/i });
      if (await toggle.isVisible()) {
          console.log('Clicking Map toggle');
          await toggle.click();
      }
  }

  await expect(visibleMap).toBeVisible();

  // 4. Wait for Pins in the visible map
  const pinLocator = visibleMap.locator('[data-testid="exact-pin"]');
  await expect(pinLocator).toBeVisible({ timeout: 10000 });

  console.log('Pin found. Tapping...');

  // Tap the pin
  await pinLocator.click();

  // Verify Tooltip is Visible inside the visible map
  const tooltipLocator = visibleMap.getByText(buildingName);
  await expect(tooltipLocator).toBeVisible();

  // Take screenshot for verification
  await page.screenshot({ path: 'verification_screenshot.png' });

  console.log('Tooltip visible. Tapping again...');

  // 6. Second Tap: Navigate
  await pinLocator.click();

  // Verify Navigation
  await expect(page).toHaveURL(new RegExp(`/building/${buildingId}`));
  console.log('Navigation successful.');

  // 7. Verify logic: Tap Map to Deselect
  await page.goBack();
  await page.waitForTimeout(1000); // wait for map load
  await expect(visibleMap).toBeVisible();

  // Re-acquire locator as page changed
  const pinLocator2 = visibleMap.locator('[data-testid="exact-pin"]');
  await expect(pinLocator2).toBeVisible();

  // Select again
  await pinLocator2.click();
  const tooltipLocator2 = visibleMap.getByText(buildingName);
  await expect(tooltipLocator2).toBeVisible();

  // Click on map container (use visibleMap locator)
  console.log('Clicking map to deselect...');
  // Avoid buttons in corners (Layer toggle top-left, Fullscreen top-right, Nav bottom-right)
  await visibleMap.click({ position: { x: 100, y: 100 }, force: true });

  await expect(tooltipLocator2).toBeHidden();
  console.log('Tooltip hidden.');
});
