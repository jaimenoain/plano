import { test, expect } from '@playwright/test';

test('Verify Map Full Screen Toggle with ESC', async ({ page }) => {
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

  // 2. Mock Google Maps (Required for dependencies even if MapLibre is used)
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
          body: JSON.stringify(null)
      });
  });

  await page.route('**/rest/v1/building_architects*', async route => {
      await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
              { architect: { id: 'arch1', name: 'Test Architect' } }
          ])
      });
  });

  // Mock image
  await page.route('**/storage/v1/object/public/**', async route => {
     await route.fulfill({
         status: 200,
         contentType: 'image/png',
         body: Buffer.from('fake-image')
     });
  });

  // 4. Navigate
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/building/b1');

  // 5. Verification
  await expect(page.getByRole('heading', { name: 'Test Building' })).toBeVisible();

  // Find the button with title "Expand Map"
  const expandBtn = page.getByTitle('Expand Map');
  await expect(expandBtn).toBeVisible();

  // Click Expand
  await expandBtn.click();

  // Wait for the state update
  await page.waitForTimeout(500);

  // Check for the presence of the collapse button, which title changes to "Collapse Map"
  const collapseBtn = page.getByTitle('Collapse Map');
  await expect(collapseBtn).toBeVisible();

  // Find the map container again. Since the class changed, we can check for the fixed class.
  const expandedMap = page.locator('.fixed.inset-0');
  await expect(expandedMap).toBeVisible();

  // Press ESC
  await page.keyboard.press('Escape');

  // Verify it collapsed
  // The collapse button should be gone (or rather, the expand button should be back)
  await expect(page.getByTitle('Expand Map')).toBeVisible();

  // The fixed map container should no longer be visible/exist
  await expect(expandedMap).not.toBeVisible();

  // Verify the small map container is there
  const smallMap = page.locator('.h-48');
  await expect(smallMap).toBeVisible();

});
