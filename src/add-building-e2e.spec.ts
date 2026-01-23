import { test, expect } from '@playwright/test';

test('End-to-End Add Building Verification', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 0. Setup Mock User Session
  await page.addInitScript(() => {
    window.localStorage.setItem('sb-gyxspsuctbrxhwiyfvlj-auth-token', JSON.stringify({
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

  // Mock Google Maps API
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
            console.log("Mock Geocode called with", request);
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
            addListener(event, handler) {
            }
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

  // Mock Supabase RPC search_buildings
  await page.route('**/rest/v1/rpc/search_buildings', async route => {
    console.log("Mock search_buildings intercepted");
    const json = [
        {
            id: 'uuid-existing-1',
            name: 'Nearby Building',
            address: '10 Nearby St',
            location_lat: 51.5075,
            location_lng: -0.1279,
            distance_meters: 20,
            similarity_score: 1.0,
            main_image_url: 'http://example.com/img.jpg',
            city: 'Test City',
            country: 'Test Country',
            styles: [],
            social_context: null,
            social_score: 0
        },
        {
            id: 'uuid-existing-2',
            name: 'Test Building Duplicate Name',
            address: '500 Far Away St',
            location_lat: 52.0000,
            location_lng: -0.2000,
            distance_meters: 60000,
            similarity_score: 0.9,
            city: 'Far City',
            country: 'Far Country',
            styles: [],
            social_context: null,
            social_score: 0
        }
    ];
    // Map response to match what search_buildings returns (distance_meters)
    // The component maps it to dist_meters, but the RPC returns distance_meters
    const response = json.map(j => ({
        ...j,
        distance_meters: j.dist_meters || j.distance_meters // handle both for mock convenience
    }));

    await route.fulfill({ json: response });
  });

  // Mock Supabase Insert to buildings
  await page.route('**/rest/v1/buildings*', async route => {
      console.log("Mock Insert intercepted", route.request().method(), route.request().url());
      if (route.request().method() === 'POST') {
          const postData = route.request().postDataJSON();
          console.log("Insert Payload:", postData);

          if (!postData.name) {
              console.error("Missing name");
              return route.abort();
          }

          await route.fulfill({
              status: 201,
              json: {
                  id: 'new-building-uuid',
                  ...postData
              }
          });
      } else {
          await route.continue();
      }
  });

  // Mock Supabase user_buildings (was log)
  await page.route('**/rest/v1/user_buildings*', async route => {
       console.log("Mock user_buildings intercepted");
       await route.fulfill({ status: 200, json: [] });
  });

  // Mock Supabase Storage Upload
  await page.route('**/storage/v1/object/building-images/*', async route => {
       console.log("Mock Storage Upload intercepted");
       await route.fulfill({
           status: 200,
           json: {
               Key: 'building-images/mock-image.jpg'
           }
       });
  });

  // 1. Navigate to page
  await page.goto('http://localhost:8080/add-building');

  // 2. Verify Map Interface (Action 1 & 2)
  await expect(page.getByText('Add a Building')).toBeVisible();
  await expect(page.getByText('Pinpoint the location on the map')).toBeVisible();

  // Check for Movie Database residue
  await expect(page.getByText('Movie Title')).not.toBeVisible();
  await expect(page.getByText('TMDB')).not.toBeVisible();

  // 3. Simulate Pin Drop (Action 2)
  const mapCanvas = page.locator('.mapboxgl-canvas, .maplibregl-canvas');
  if (await mapCanvas.count() > 0) {
      // Force click since canvas intercepts events
      await mapCanvas.first().click({ position: { x: 300, y: 300 }, force: true });
  } else {
      console.log("Map canvas not found via class, trying generic canvas");
      await page.locator('canvas').first().click({ position: { x: 300, y: 300 }, force: true });
  }

  // Wait for duplicate check to fire
  await page.waitForTimeout(1000);

  // 4. Verify Duplicate Detection (Action 3)
  // "Nearby Buildings" logic
  // The UI shows a list of duplicates if found.
  // We need to ensure that the code logic (step 1) triggers the RPC.
  // The click on map sets `markerPosition` which triggers `useEffect`.

  // Check if duplicates are displayed
  // If the click didn't work (canvas issues), we might need to manually set marker via evaluate?
  // But let's hope click works.

  // If duplicates are found, "Continue" button should still be clickable but show dialog.

  // 5. Attempt to proceed
  await page.getByRole('button', { name: 'Continue' }).click();

  // 6. Verify Dialog
  // Wait for dialog
  await expect(page.getByText('Duplicate Building Found')).toBeVisible({ timeout: 5000 });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Same Location')).toBeVisible();
  // Scope 'Nearby Building' check to dialog as well to avoid ambiguity if needed,
  // though 'Nearby Building' might be unique enough or strict mode triggers if multiple duplicates.
  // Actually, 'Nearby Building' is the name of the first building. It appears in Sidebar AND Dialog.
  await expect(dialog.getByText('Nearby Building')).toBeVisible();

  // 7. Choose to create new entry anyway
  await dialog.getByText('No, I want to create a new entry').click();

  // 8. Verify Step 2 (Metadata) (Action 4)
  await expect(page.getByText('Add Details')).toBeVisible();

  // Verify Form Fields
  await expect(page.getByLabel('Name *')).toBeVisible();

  // Verify pills exist and fields are hidden
  await expect(page.getByRole('button', { name: 'Add Year' })).toBeVisible();
  await expect(page.getByLabel('Year Built')).not.toBeVisible();

  // Click pills to reveal
  await page.getByRole('button', { name: 'Add Year' }).click();
  await page.getByRole('button', { name: 'Add Architects' }).click();
  await page.getByRole('button', { name: 'Add Style' }).click();
  await page.getByRole('button', { name: 'Add Description' }).click();

  // Now verify fields are visible
  await expect(page.getByLabel('Year Built')).toBeVisible();
  await expect(page.getByText('Architects', { exact: true })).toBeVisible();
  await expect(page.getByText('Architectural Styles', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Description')).toBeVisible();

  // Verify NO Movie fields
  await expect(page.getByText('Director')).not.toBeVisible();
  await expect(page.getByText('Release Date')).not.toBeVisible();

  // 9. Fill Form
  await page.getByLabel('Name *').fill('My New Test Building');
  await page.getByLabel('Year Built').fill('2024');
  await page.getByLabel('Description').fill('A test building description.');

  // Architects is a TagInput. Type and Enter.
  const architectInput = page.getByPlaceholder('Type and press Enter to add architect...');
  await architectInput.fill('Zaha Hadid');
  await architectInput.press('Enter');

  // Styles is AutocompleteTagInput.
  const styleInput = page.getByPlaceholder('Type to search or add style...');
  await styleInput.fill('Futurism');
  await styleInput.press('Enter');

  // 11. Submit (Action 6)
  await page.getByRole('button', { name: 'Save Building' }).click();

  // 12. Verify Success and Redirection
  await expect(page.getByText('Building added successfully!')).toBeVisible();

  // The code opens a RecommendDialog ("Have you visited this building?").
  // We can just verify we are on the new building page URL if the code navigates.
  // But code says: `if (!open && newBuilding) { navigate(...) }`
  // So we must close the dialog.
  await page.keyboard.press('Escape');

  // Verify URL matches /building/new-building-uuid
  await expect(page).toHaveURL(/\/building\/new-building-uuid/);
});
