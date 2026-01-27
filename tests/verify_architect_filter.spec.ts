import { test, expect } from '@playwright/test';

test('Verify Architect Filter passes correct parameters to RPC', async ({ page }) => {
  // 1. Setup Mock User Session (Authenticated)
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
            role: "authenticated",
            user_metadata: { onboarding_completed: true }
        }
    }));
  });

  // Mock Google Maps
  await page.addInitScript(() => {
    window.google = {
      maps: {
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener(event, handler) {}
            getCenter() { return { lat: () => 51.5074, lng: () => -0.1278 }; }
            getBounds() { return { getNorthEast: () => ({ lat: () => 52, lng: () => 0 }), getSouthWest: () => ({ lat: () => 51, lng: () => -1 }) }; }
        },
        Marker: class { setMap() {} setPosition() {} },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async (lib) => ({}),
        places: { AutocompleteService: class {}, PlacesService: class {} },
        Geocoder: class {}
      }
    };
  });

  // Intercept initial RPC calls
  await page.route('**/rest/v1/rpc/search_buildings*', async route => {
    console.log("Mocking initial search_buildings");
    await route.fulfill({
        status: 200,
        json: [
            {
                id: 'b1', name: 'Building 1',
                architects: [{id: 'a1', name: 'Zaha Hadid'}],
                location_lat: 51.5, location_lng: -0.1,
                main_image_url: 'img1.jpg'
            },
            {
                id: 'b2', name: 'Building 2',
                architects: [{id: 'a2', name: 'Frank Gehry'}],
                location_lat: 51.51, location_lng: -0.11,
                main_image_url: 'img2.jpg'
            }
        ]
    });
  });

  await page.route('**/rest/v1/rpc/get_discovery_filters', async route => {
      await route.fulfill({ status: 200, json: { cities: [], styles: [] } });
  });

  // 2. Navigate to Search Page
  await page.goto('http://localhost:8080/search');

  // 3. Open Filter Sheet
  await page.getByRole('button').filter({ has: page.locator('svg.lucide-list-filter') }).click();
  await expect(page.getByText('Filters')).toBeVisible();

  // DEBUG: Print sheet content
  const sheetContent = await page.locator('[role="dialog"]').innerHTML();
  console.log("Sheet Content:", sheetContent);

  // 4. Select Architect "Zaha Hadid"
  // The logic in DiscoveryFilterBar uses a Popover with Command
  // But wait, the DiscoveryFilterBar only shows the "Architects" section if `availableArchitects` is present.
  // `availableArchitects` is derived from `buildings`.
  // Our mock buildings have Zaha Hadid. So she should be in the list.

  // Use locator restricted to label tag
  await expect(page.locator('label').filter({ hasText: 'Architects' })).toBeVisible();

  // Click the combobox
  await page.getByRole('combobox').filter({ hasText: 'Search architects' }).click();

  // Select option
  await page.getByRole('option', { name: 'Zaha Hadid' }).click();

  // 5. Verify Request
  // Now we intercept the NEXT search_buildings call which triggers on filter change
  // We need to wait for it.

  const searchRequestPromise = page.waitForRequest(request =>
      request.url().includes('rpc/search_buildings') &&
      request.method() === 'POST' &&
      request.postDataJSON().filters?.architects?.includes('Zaha Hadid')
  );

  // Triggering the change should cause the hook to refetch
  console.log("Waiting for RPC call with filter...");
  const request = await searchRequestPromise;

  console.log("Captured Request Payload:", request.postDataJSON());

  const payload = request.postDataJSON();
  expect(payload.filters).toBeDefined();
  expect(payload.filters.architects).toEqual(['Zaha Hadid']);

  console.log("✅ Verification Passed: RPC called with correct architect filter.");
});
