import { test, expect } from '@playwright/test';

test('verify edit button redirects to review page for visited buildings', async ({ page }) => {
  const buildingId = '00000000-0000-0000-0000-000000000001';
  const userId = 'user-uuid';

  // 0. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-lnqxtomyucnnrgeapnzt-auth-token', JSON.stringify({
        access_token: "fake-token",
        refresh_token: "fake-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
            id: "user-uuid",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated"
        }
    }));
  });

  // Mock Building Details
  const buildingData = [{
    id: buildingId,
    name: 'Test Building',
    location: { type: 'Point', coordinates: [0, 0] },
    location_precision: 'exact',
    address: '123 Test St',
    architects: [],
    year_completed: 2020,
    styles: [],
    created_by: 'other-user',
    slug: 'test-building',
    short_id: 123
  }];

  await page.route('**/rest/v1/buildings?*', async route => {
    await route.fulfill({ status: 200, json: buildingData });
  });

  await page.route('**/rest/v1/rpc/get_building_details_v2', async route => {
    await route.fulfill({ status: 200, json: buildingData });
  });

  await page.route('**/rest/v1/building_architects?*', async route => {
    await route.fulfill({ status: 200, json: [] });
  });

  // Mock Top Links
  await page.route('**/rest/v1/rpc/get_building_top_links', async route => {
    await route.fulfill({ status: 200, json: [] });
  });

  // Mock Follows
  await page.route('**/rest/v1/follows?*', async route => {
     await route.fulfill({ status: 200, json: [] });
  });

  // Mock User Building (The Critical Part)
  // When fetching specific user entry
  await page.route('**/rest/v1/user_buildings?*', async route => {
    const url = route.request().url();
    if (url.includes(`user_id=eq.${userId}`) && url.includes(`building_id=eq.${buildingId}`)) {
        await route.fulfill({
          status: 200,
          json: {
            id: 'review-1',
            user_id: userId,
            building_id: buildingId,
            rating: 5,
            content: 'Great place!',
            status: 'visited',
            tags: ['nice'],
            created_at: new Date().toISOString(),
            images: []
          }
        });
    } else if (url.includes('order=created_at')) {
        // Feed
        await route.fulfill({ status: 200, json: [] });
    } else {
        await route.continue();
    }
  });

  // Navigate to building page
  // We use the ID route to keep it simple, though the component might redirect or handle slug
  await page.goto(`http://localhost:8080/building/${buildingId}`);

  // Wait for "Your Activity" to appear
  await expect(page.getByText('Your Activity')).toBeVisible();

  // Locate the "Edit" button in that section
  // It is currently a button with text "Edit"
  // We scope it to the "Your Activity" container to avoid matching the "Edit building information" link at the bottom
  const activitySection = page.locator('.bg-card', { hasText: 'Your Activity' });

  // Verify it is a LINK (This should FAIL currently, as it is a button with onClick)
  const editLink = activitySection.getByRole('link', { name: 'Edit' });

  // We expect this to be visible. Currently it won't be found as a link.
  await expect(editLink).toBeVisible();

  // Verify href
  // Since short_id is present (123) and slug is present, getBuildingUrl uses them.
  await expect(editLink).toHaveAttribute('href', `/building/123/test-building/review`);
});
