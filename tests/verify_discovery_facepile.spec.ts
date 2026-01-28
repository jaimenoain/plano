import { test, expect } from '@playwright/test';

test('Verify Discovery Facepile Text', async ({ page }) => {
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
        Map: class {
            setCenter() {}
            setZoom() {}
            addListener() {}
            getCenter() { return { lat: () => 51.5074, lng: () => -0.1278 }; }
        },
        Marker: class {
            setMap() {}
            setPosition() {}
            addListener() {}
        },
        ControlPosition: { TOP_RIGHT: 1 },
        importLibrary: async () => ({}),
        places: {
            AutocompleteService: class {
                getPlacePredictions() { return { predictions: [] }; }
            },
            PlacesService: class {
                getDetails() {}
            }
        },
        Geocoder: class {
            geocode() { return { results: [] }; }
        }
      }
    };
  });

  // 3. Network Interception
  await page.route('**', async route => {
      const url = route.request().url();

      // Mock Search RPC
      if (url.includes('rpc/search_buildings')) {
           await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([{
                  id: 'building-facepile',
                  name: 'Test Facepile Building',
                  location_lat: 51.5074,
                  location_lng: -0.1278,
                  address: 'London, UK',
                  main_image_url: null,
                  architects: [],
                  year_completed: 2020,
                  styles: [],
                  city: 'London',
                  country: 'UK',
                  social_score: 100
              }])
           });
           return;
      }

      // Mock Follows
      if (url.includes('/rest/v1/follows')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  { following_id: 'friend-1' },
                  { following_id: 'friend-2' },
                  { following_id: 'friend-3' },
                  { following_id: 'friend-4' }
              ])
          });
          return;
      }

      // Mock User Buildings
      if (url.includes('/rest/v1/user_buildings')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  {
                      building_id: 'building-facepile',
                      status: 'visited',
                      rating: null,
                      user: { id: 'friend-1', first_name: 'Jaime', last_name: 'L', avatar_url: null }
                  },
                   {
                      building_id: 'building-facepile',
                      status: 'visited',
                      rating: null,
                      user: { id: 'friend-2', first_name: 'Friend2', last_name: 'L', avatar_url: null }
                  },
                   {
                      building_id: 'building-facepile',
                      status: 'visited',
                      rating: null,
                      user: { id: 'friend-3', first_name: 'Friend3', last_name: 'L', avatar_url: null }
                  },
                   {
                      building_id: 'building-facepile',
                      status: 'visited',
                      rating: null,
                      user: { id: 'friend-4', first_name: 'Friend4', last_name: 'L', avatar_url: null }
                  }
              ])
          });
          return;
      }

      // Mock get_discovery_filters (often called on load)
      if (url.includes('rpc/get_discovery_filters')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ cities: [], styles: [] })
          });
          return;
      }

      await route.continue();
  });

  // 4. Test Execution
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/search?q=Test');

  // Verify Page Loaded and Building Card Visible
  const card = page.locator('.md\\:grid').getByRole('heading', { name: 'Test Facepile Building' });
  await expect(card).toBeVisible({ timeout: 10000 });

  // 5. Verify Facepile Text
  // Current behavior expectation: "Visited by 4 friends"
  // New behavior expectation: "Jaime + 3"

  // We can assert that it currently contains "Visited by" to verify the setup is working
  // or just assert the future state if we plan to fail first.

  // Let's assert the presence of "Jaime" at least, which works in both cases?
  // Current: "Visited by 4 friends" (wait, my manual trace says it shows count if > 1)
  // `Visited by ${building.contact_visitors.length} friends` -> "Visited by 4 friends"
  // So "Jaime" is NOT in the current text.

  // So the test should fail if I expect "Jaime + 3" right now.
  // I will make it expect "Jaime + 3" so it fails, confirming the need for change.
  // Or I can comment it out and run it manually, but for automation flow, let's write the target expectation.

  await expect(page.getByText('Jaime + 3')).toBeVisible({ timeout: 5000 });
});
