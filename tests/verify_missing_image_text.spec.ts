import { test, expect } from '@playwright/test';

test('Verify Building Details Missing Image Text', async ({ page }) => {
  // 1. Mock Session
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

  // 2. Mock Google Maps (Standard minimal mock)
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

  // 3. Mock Network
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes('id=eq.b_no_img')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: 'b_no_img',
                  name: 'No Image Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '404 No Image Ln',
                  architects: [],
                  year_completed: 2024,
                  styles: [],
                  main_image_url: null, // KEY: No image
                  description: 'A building with no image',
                  created_by: 'user-other'
              })
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/user_buildings*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null)
      });
  });

  // 4. Navigate
  await page.goto('http://localhost:8080/building/b_no_img');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'No Image Building' })).toBeVisible();

  // Check for the new text
  await expect(page.getByText('No image yet - be the first to add a photo of this building', { exact: true })).toBeVisible();
});
