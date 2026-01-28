
import { test, expect } from '@playwright/test';

test('Verify Demolished/Unbuilt Badges in Search', async ({ page }) => {
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

  // 2. Mock Google Maps
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
              body: JSON.stringify([
                  {
                      id: 'building-demolished',
                      name: 'Demolished Tower',
                      location_lat: 51.5,
                      location_lng: -0.1,
                      address: 'London, UK',
                      main_image_url: null,
                      architects: [],
                      year_completed: 1990,
                      city: 'London',
                      country: 'UK'
                  },
                  {
                      id: 'building-unbuilt',
                      name: 'Unbuilt Vision',
                      location_lat: 51.6,
                      location_lng: -0.2,
                      address: 'London, UK',
                      main_image_url: null,
                      architects: [],
                      year_completed: 2020,
                      city: 'London',
                      country: 'UK'
                  }
              ])
          });
          return;
      }

      // Mock Status Fetch (REST API)
      // The app will request /rest/v1/buildings?select=id,status&id=in.(...)
      if (url.includes('/rest/v1/buildings') && url.includes('select=id%2Cstatus')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  { id: 'building-demolished', status: 'Demolished' },
                  { id: 'building-unbuilt', status: 'Unbuilt' }
              ])
          });
          return;
      }

      // Mock Building Attributes (in case it still tries to fetch them or legacy calls)
      if (url.includes('/rest/v1/building_attributes')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([])
          });
          return;
      }

      // Mock Metadata
      if (url.includes('rpc/get_discovery_filters') || url.includes('functional_categories')) {
           await route.fulfill({ status: 200, body: JSON.stringify([]) });
           return;
      }

      await route.continue();
  });

  // 4. Test Execution
  console.log('Navigating to /search...');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/search');

  // Trigger search
  await page.getByPlaceholder('Search buildings, architects...').fill('Tower');

  // Verify Badges
  await expect(page.locator('.md\\:grid').getByText('Demolished', { exact: true })).toBeVisible();
  await expect(page.locator('.md\\:grid').getByText('Unbuilt', { exact: true })).toBeVisible();

  // Verify Names
  await expect(page.locator('.md\\:grid').getByRole('heading', { name: 'Demolished Tower' })).toBeVisible();
  await expect(page.locator('.md\\:grid').getByRole('heading', { name: 'Unbuilt Vision' })).toBeVisible();

  // Take Screenshot
  await page.screenshot({ path: 'verification_badges.png', fullPage: true });
});
