import { test, expect } from '@playwright/test';
import fs from 'fs';

test('verify no image placeholder and upload link', async ({ page }) => {
  const buildingId = 'mock-building-id';

  // Mock building details (and any other tables needed for initial render)
  await page.route('**/rest/v1/buildings?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: buildingId,
        name: 'Test Building',
        location: { type: 'Point', coordinates: [0, 0] },
        location_precision: 'exact',
        address: '123 Test St',
        architects: [],
        year_completed: 2020,
        styles: [],
        created_by: 'user-1',
        slug: 'test-building',
        short_id: 123
      })
    });
  });

  // Handle RPC for building details fallback
  await page.route('**/rest/v1/rpc/get_building_details_v2', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: buildingId,
            name: 'Test Building',
            location: { type: 'Point', coordinates: [0, 0] },
            location_precision: 'exact',
            address: '123 Test St',
            architects: [],
            year_completed: 2020,
            styles: [],
            created_by: 'user-1',
            slug: 'test-building',
            short_id: 123
          }])
      });
  });

  await page.route('**/rest/v1/rpc/search_buildings', async route => {
     await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
     });
  });

  await page.route('**/rest/v1/building_architects?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Mock user_buildings (reviews) - Empty feed
  await page.route('**/rest/v1/user_buildings?*', async route => {
      // Return empty array for feed
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  // Mock top links - Empty
  await page.route('**/rest/v1/rpc/get_building_top_links', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  await page.goto(`http://localhost:3000/building/${buildingId}`);

  // Wait for "No image yet" to appear
  await expect(page.getByText('No image yet')).toBeVisible();

  // Create verification dir if not exists
  if (!fs.existsSync('verification')) {
    fs.mkdirSync('verification', { recursive: true });
  }
  await page.screenshot({ path: 'verification/no_image_placeholder_before.png' });

  // Verify that the "Upload photo" link is present
  const uploadLink = page.getByRole('link', { name: /upload photo/i });
  await expect(uploadLink).toBeVisible();

  // Verify the href
  const href = await uploadLink.getAttribute('href');
  expect(href).toContain('/review');
  expect(href).toContain('test-building'); // slug check

  await page.screenshot({ path: 'verification/no_image_placeholder_after.png' });
});
