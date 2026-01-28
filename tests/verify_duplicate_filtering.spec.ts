import { test, expect } from '@playwright/test';

test('Verify Duplicate Building Filtering Logic', async ({ page }) => {
  test.setTimeout(30000);

  // 1. Setup Mock User Session
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

  // 2. Mock Google Maps API
  await page.addInitScript(() => {
    window.google = {
      maps: {
        places: {
          AutocompleteService: class {},
          PlacesService: class {
            findPlaceFromQuery() {}
          }
        },
        Geocoder: class {
          geocode(request, callback) {
            const result = [{
              formatted_address: "123 Test St, Test City, Test Country",
              address_components: [
                { types: ["locality"], long_name: "Test City" },
                { types: ["country"], long_name: "Test Country", short_name: "TC" }
              ],
              geometry: {
                location: {
                  lat: () => 51.5074,
                  lng: () => -0.1278
                }
              }
            }];
            callback(result, "OK");
          }
        },
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener() {}
        },
        Marker: class {
            setMap() {}
            setPosition() {}
        },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async (lib) => {
             return {};
        },
      }
    };
  });

  // 3. Mock Supabase RPC find_nearby_buildings
  await page.route('**/rest/v1/rpc/find_nearby_buildings', async route => {
    const json = [
        {
            id: 'uuid-close-1',
            name: 'Close Building',
            address: '10 Nearby St',
            location_lat: 51.5075,
            location_lng: -0.1279,
            dist_meters: 10,
            similarity_score: 0.2, // Low similarity, but very close
            main_image_url: null
        },
        {
            id: 'uuid-far-high-sim',
            name: 'Far High Sim Building',
            address: '500 Far Away St',
            location_lat: 52.0000,
            location_lng: -0.2000,
            dist_meters: 5000,
            similarity_score: 0.9, // High similarity, far away
            main_image_url: null
        },
        {
            id: 'uuid-far-low-sim',
            name: 'Far Low Sim Building',
            address: '600 Far Away St',
            location_lat: 52.0000,
            location_lng: -0.2000,
            dist_meters: 5000,
            similarity_score: 0.4, // Low similarity, far away. SHOULD BE FILTERED OUT by new logic
            main_image_url: null
        }
    ];
    await route.fulfill({ json });
  });

  // Mock other RPCs to prevent errors
  await page.route('**/rest/v1/rpc/search_buildings', async route => {
    await route.fulfill({ json: [] });
  });
  await page.route(/user_buildings/, async route => {
       await route.fulfill({ status: 200, json: [] });
  });

  // 4. Navigate to page
  await page.goto('http://localhost:8080/add-building');

  // 5. Simulate Pin Drop
  const mapCanvas = page.locator('.mapboxgl-canvas, .maplibregl-canvas');
  if (await mapCanvas.count() > 0) {
      await mapCanvas.first().click({ position: { x: 300, y: 300 }, force: true });
  } else {
      await page.locator('canvas').first().click({ position: { x: 300, y: 300 }, force: true });
  }

  // 6. Enter a name to trigger fuzzy name search (requires name input or place selection)
  await page.getByPlaceholder('e.g. The Shard').fill('Test Building');

  // Wait for duplicate check to fire
  await page.waitForTimeout(2000);

  // 7. Check results
  await expect(page.getByText('Nearby Buildings')).toBeVisible();

  // "Close Building" should be visible (Same Location / Vicinity)
  // use .first() because the map marker also contains this text (in a tooltip)
  await expect(page.getByText('Close Building').first()).toBeVisible();

  // "Far High Sim Building" should be visible (Similar Names)
  await expect(page.getByText('Far High Sim Building').first()).toBeVisible();

  // "Far Low Sim Building" should be HIDDEN now
  await expect(page.getByText('Far Low Sim Building').first()).not.toBeVisible();
});
