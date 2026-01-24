import { test, expect } from '@playwright/test';

test('Verify Review Images in Community Notes', async ({ page }) => {
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
      if (url.includes('id=eq.b1')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: 'b1',
                  name: 'Test Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  architects: ['Test Architect'],
                  year_completed: 2020,
                  styles: ['Modern'],
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
      const url = route.request().url();
      console.log('Intercepted user_buildings:', url);

      // Match the feed query which includes review_images
      // URL encoded: images%3Areview_images
      if (url.includes('images%3Areview_images')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  {
                      id: 'review-1',
                      content: 'Great building with photo!',
                      rating: 5,
                      status: 'visited',
                      tags: [],
                      created_at: new Date().toISOString(),
                      user: {
                          username: 'Photographer',
                          avatar_url: null
                      },
                      images: [
                          {
                              id: 'img-1',
                              storage_path: 'user/building/img1.webp'
                          },
                          {
                              id: 'img-2',
                              storage_path: 'user/building/img2.webp'
                          }
                      ]
                  }
              ])
          });
      }
      // Match the user specific status check (contains user_id=eq)
      else if (url.includes('user_id=eq.')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(null)
          });
      }
      else {
          await route.continue();
      }
  });

  // 4. Navigate
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/building/b1');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // Check for the reviewer name
  await expect(page.getByText('Photographer')).toBeVisible();

  // Check for the content
  await expect(page.getByText('Great building with photo!')).toBeVisible();

  // Check for images
  const images = page.getByRole('img', { name: 'Review photo' });
  await expect(images).toHaveCount(2);

  const firstSrc = await images.first().getAttribute('src');
  console.log('First image src:', firstSrc);
  expect(firstSrc).toContain('/storage/v1/object/public/review_images/user/building/img1.webp');
});
