import { test, expect } from '@playwright/test';

test('Verify User Location Auto-Discovery', async ({ page, context }) => {
  // 1. Grant Permissions & Set Geolocation (New York)
  const NEW_YORK = { latitude: 40.7128, longitude: -74.0060 };
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(NEW_YORK);

  // 2. Setup Mock User Session
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

  // 3. Monitor console/toast for "Location updated" or silence
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  // Intercept Search RPC to avoid errors
  await page.route('**/rpc/search_buildings', async route => {
      // Return empty results
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  await page.route('**/rpc/get_discovery_filters', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cities: [], styles: [] })
      });
  });

  // 4. Navigate
  await page.goto('http://localhost:8080/search');

  // 5. Verify that the search RPC is called with the User's Location (New York)
  // We expect the first call might be with default London, so we wait for the correct one.
  const searchRequest = await page.waitForRequest(req => {
      if (!req.url().includes('rpc/search_buildings') || req.method() !== 'POST') return false;
      const data = req.postDataJSON();
      // Check if lat matches New York (approx)
      return Math.abs(data.location_coordinates?.lat - NEW_YORK.latitude) < 0.1;
  });

  const postData = searchRequest.postDataJSON();
  console.log('Search RPC Payload:', postData);

  expect(postData.location_coordinates.lat).toBeCloseTo(NEW_YORK.latitude, 1);
  expect(postData.location_coordinates.lng).toBeCloseTo(NEW_YORK.longitude, 1);

  // 6. Verify silence (no toast should appear for auto-update)
  // Toasts usually appear in the DOM. "Location updated"
  // Wait a bit to ensure no toast appears
  await page.waitForTimeout(1000);
  const toast = page.getByText('Location updated');
  await expect(toast).not.toBeVisible();

});
