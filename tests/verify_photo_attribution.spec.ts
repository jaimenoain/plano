import { test, expect } from '@playwright/test';

test('Verify Photo Attribution in Building Details and Modal', async ({ page }) => {
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

  // 2. Mock Google Maps (Minimal)
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
            AutocompleteService: class { getPlacePredictions() { return { predictions: [] }; } },
            PlacesService: class { getDetails() {} }
        },
        Geocoder: class { geocode() { return { results: [] }; } }
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
                  name: 'Attribution Building',
                  location: { type: 'Point', coordinates: [-0.1278, 51.5074] },
                  address: '123 Test St, London',
                  architects: [],
                  year_completed: 2020,
                  styles: [],
                  created_by: 'user-other'
              })
          });
      } else {
          await route.continue();
      }
  });

  await page.route('**/rest/v1/building_architects*', async route => {
       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/rpc/get_building_top_links', async route => {
       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Mock User Buildings (The Review with Images)
  await page.route('**/rest/v1/user_buildings*', async route => {
      const url = route.request().url();
      if (url.includes('images%3Areview_images')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                  {
                      id: 'review-1',
                      content: 'Nice photo!',
                      rating: 5,
                      status: 'visited',
                      tags: [],
                      created_at: '2023-10-15T12:00:00Z',
                      user: {
                          username: 'PhotoUser123',
                          avatar_url: null
                      },
                      images: [
                          {
                              id: '123e4567-e89b-12d3-a456-426614174001',
                              storage_path: 'user/building/img1.webp',
                              likes_count: 5,
                              created_at: '2023-10-15T12:00:00Z'
                          }
                      ]
                  }
              ])
          });
      } else {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
      }
  });

  // Mock image comments/likes for the modal
  await page.route('**/rest/v1/image_comments*', async route => {
     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/review_images*', async route => {
      // Mock fetching single image details if needed by modal
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ likes_count: 5 })
      });
  });

  await page.route('**/rest/v1/image_likes*', async route => {
       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
  });

  // 4. Navigate
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/building/123e4567-e89b-12d3-a456-426614174000');

  // 5. Verify Photo Column Attribution
  // The left column should have the image
  const photoContainer = page.locator('.aspect-\\[4\\/3\\]').first();
  await expect(photoContainer).toBeVisible();

  // Check for attribution overlay
  // We expect "PhotoUser123" and date (Oct 2023 or similar) to be visible inside/on the photo container
  await expect(photoContainer.getByText('PhotoUser123')).toBeVisible();
  // Depending on date formatting, checking for 'Oct' or '2023' is safer
  await expect(photoContainer.getByText(/Oct.*2023|2023.*Oct/i)).toBeVisible();

  // 6. Verify Modal Attribution
  await photoContainer.click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Sidebar should contain attribution
  const sidebar = modal.locator('.border-l'); // Right side has border-l
  await expect(sidebar.getByText('PhotoUser123')).toBeVisible();
  await expect(sidebar.getByText(/Oct.*2023|2023.*Oct/i)).toBeVisible();
});
