import { test, expect } from '@playwright/test';

test('Verify Review Images in Community Notes', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', exception => console.log(`PAGE ERROR: "${exception}"`));

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
      if (url.includes('id=eq.123e4567-e89b-12d3-a456-426614174000')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  name: 'Test Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  architects: ['Test Architect'],
                  year_completed: 2020,
                  styles: [{ style: { id: 's1', name: 'Modern' } }],
                  main_image_url: 'https://example.com/image.jpg',
                  description: 'A test building',
                  created_by: 'user-other'
              })
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/building_architects*', async route => {
       await route.fulfill({
           status: 200,
           contentType: 'application/json',
           body: JSON.stringify([])
       });
  });

  await page.route('**/rest/v1/rpc/get_building_top_links', async route => {
       await route.fulfill({
           status: 200,
           contentType: 'application/json',
           body: JSON.stringify([])
       });
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
  await page.goto('http://localhost:8080/building/123e4567-e89b-12d3-a456-426614174000');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // Check for the reviewer name
  // Now "Photographer" appears in the image overlays as well, so we look for the link in the community note
  await expect(page.getByRole('link', { name: 'Photographer' })).toBeVisible();

  // Check for the content
  await expect(page.getByText('Great building with photo!').first()).toBeVisible();

  // Check for images
  // Scope to Community Notes section to avoid counting "Your Activity" images
  // "Community Notes" header is an h3, and the list is in the following div
  const communitySection = page.locator('h3:has-text("Community Notes") + div');
  const images = communitySection.getByRole('img', { name: 'Review photo' });
  await expect(images).toHaveCount(2);

  const firstSrc = await images.first().getAttribute('src');
  console.log('First image src:', firstSrc);
  expect(firstSrc).toContain('https://s3.eu-west-2.amazonaws.com/plano.app/user/building/img1.webp');
});
