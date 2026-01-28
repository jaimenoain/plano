import { test, expect } from '@playwright/test';

test('Regression: Verify "View Review" link removal', async ({ page }) => {
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

  // 3. Mock Network
  await page.route('**/rest/v1/buildings*', async route => {
      const url = route.request().url();
      if (url.includes('id=eq.00000000-0000-0000-0000-000000000001')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: '00000000-0000-0000-0000-000000000001',
                  name: 'Test Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  city: 'London',
                  country: 'UK',
                  architects: [],
                  year_completed: 2020,
                  styles: [{ style: { id: 'style1', name: 'Modern' } }],
                  main_image_url: 'https://example.com/image.jpg',
                  description: 'A test building',
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
          body: JSON.stringify([
            {
                id: 'entry1',
                content: 'Nice',
                rating: 5,
                status: 'visited',
                tags: [],
                created_at: new Date().toISOString(),
                user: { username: 'testuser', avatar_url: null },
                images: [{ id: 'img1', storage_path: 'path/to/img.jpg', likes_count: 5 }]
            }
          ])
      });
  });

  await page.route('**/rest/v1/building_architects*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
      });
  });

  await page.route('**/storage/v1/object/public/**', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-image-data')
      });
  });

  // 4. Navigate
  await page.goto('http://localhost:8080/building/00000000-0000-0000-0000-000000000001');

  // 5. Verification
  // Expect "View Review" to be NOT visible
  await expect(page.getByText('View Review')).not.toBeVisible();
});
