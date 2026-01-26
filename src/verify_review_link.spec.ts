import { test, expect } from '@playwright/test';
import fs from 'fs';

test('verify review link in building details', async ({ page }) => {
  const buildingId = 'mock-building-id';
  const reviewId = 'mock-review-id';
  const reviewerUsername = 'reviewer';
  const reviewContent = 'Great building!';

  // Mock building details (and any other tables needed for initial render)
  await page.route('**/rest/v1/buildings?*', async route => {
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
        created_by: 'user-1'
      }])
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
          created_by: 'user-1'
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

  // Mock user_buildings (reviews)
  await page.route('**/rest/v1/user_buildings?*', async route => {
    const url = route.request().url();
    // Check if it's the reviews query (filtering by building_id and NOT single user lookup if possible to distinguish)
    // The feed query: .eq("building_id", id).order("created_at", { ascending: false })
    // It might look like: building_id=eq.mock-building-id&order=created_at.desc

    if (url.includes(`building_id=eq.${buildingId}`) && url.includes('order=created_at.desc')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: reviewId,
            content: reviewContent,
            rating: 5,
            status: 'visited',
            tags: [],
            created_at: new Date().toISOString(),
            user: {
              username: reviewerUsername,
              avatar_url: null
            },
            images: []
          }])
        });
    } else {
        // Fallback (e.g. user specific entry)
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]) // No user entry for current user
        });
    }
  });

  // Mock top links
  await page.route('**/rest/v1/rpc/get_building_top_links', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  // Mock storage for images if needed (though we return empty images array)

  await page.goto(`http://localhost:3000/building/${buildingId}`);

  // Wait for review to appear
  await expect(page.getByText(reviewContent)).toBeVisible();

  // Create verification dir if not exists
  if (!fs.existsSync('/home/jules/verification')) {
    fs.mkdirSync('/home/jules/verification', { recursive: true });
  }

  await page.screenshot({ path: '/home/jules/verification/review_link.png' });

  // Check if the content is wrapped in a link to /review/mock-review-id
  // We look for an anchor tag with the specific href that contains the review content text
  const linkLocator = page.locator(`a[href="/review/${reviewId}"]`);

  // We expect this to contain the review content
  await expect(linkLocator).toContainText(reviewContent);
});
