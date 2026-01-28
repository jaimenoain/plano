import { test, expect } from '@playwright/test';

test('Verify Building Details Summary Card vs Edit Form', async ({ page }) => {
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
        places: { AutocompleteService: class {}, PlacesService: class {} },
        Geocoder: class { geocode() { return { results: [] }; } }
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
                  created_by: 'user-other',
                  main_image_url: null,
                  styles: []
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

  // Mock user_buildings to return a "visited" entry with review
  await page.route('**/rest/v1/user_buildings*', async route => {
      // Check if it's the specific fetch for user entry (usually has maybeSingle or similar query params, or just by the user_id/building_id filter)
      const url = route.request().url();
      if (url.includes('user_id=eq.user-uuid') && url.includes('building_id=eq.00000000-0000-0000-0000-000000000001')) {
          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                  id: 'ub1',
                  user_id: 'user-uuid',
                  building_id: '00000000-0000-0000-0000-000000000001',
                  status: 'visited',
                  rating: 5,
                  content: 'This is a summary note.',
                  tags: ['Cool', 'Modern'],
                  images: [
                      { id: 'img1', storage_path: 'user-uuid/00000000-0000-0000-0000-000000000001/photo1.jpg' }
                  ]
              })
          });
      } else {
          // This might catch the feed fetch too, which is fine to return empty or same
          await route.fulfill({ status: 200, body: JSON.stringify([]) });
      }
  });

  // Mock image URL generation (Supabase Storage) - actually this is client side logic usually, but the fetch to storage is via URL construction.
  // The test just checks for <img> tag presence.

  // 4. Navigate
  await page.goto('http://localhost:8080/building/00000000-0000-0000-0000-000000000001');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // Verify Summary Card appears
  await expect(page.getByText('Your Activity')).toBeVisible();
  await expect(page.getByText('This is a summary note.')).toBeVisible();
  await expect(page.getByText('Cool')).toBeVisible();

  // Verify Inline Editor is HIDDEN
  // The textarea has placeholder "Write a note..."
  await expect(page.getByPlaceholder('Write a note...')).toBeHidden();

  // Verify Edit Button exists and Click it
  // Find the button inside the header which contains "Your Activity"
  const editBtn = page.locator('h3', { hasText: 'Your Activity' }).locator('..').getByRole('link', { name: 'Edit' });
  await expect(editBtn).toBeVisible();

  await editBtn.click();

  // Verify Inline Editor (on Review page) is now VISIBLE
  // The placeholders might differ on the dedicated review page
  await expect(page.getByPlaceholder('What did you think about this building?')).toBeVisible();

});
